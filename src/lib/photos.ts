import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getParticipant } from "@/lib/participant";
import { applyFilmFilter, applyWatermark } from "@/lib/image";
import type { Event, Photo } from "@/lib/types";

/** Participant of the event or its ambassador — the only people who see photos. */
export async function canViewEvent(event: Event): Promise<boolean> {
  const participant = await getParticipant(event.id);
  if (participant) return true;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id === event.ambassador_id;
}

export async function downloadFromStorage(
  admin: SupabaseClient,
  path: string
): Promise<Buffer> {
  const { data, error } = await admin.storage.from("photos").download(path);
  if (error || !data) throw new Error(`Missing storage object: ${path}`);
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Returns the developed (post-reveal) version of a photo, processing and
 * caching it in storage on first request. The film filter gets baked in here.
 */
export async function ensureRevealedVersion(
  admin: SupabaseClient,
  event: Event,
  photo: Photo
): Promise<Buffer> {
  if (!event.revealed) throw new Error("Not revealed");

  if (photo.revealed_path) {
    return downloadFromStorage(admin, photo.revealed_path);
  }

  const original = await downloadFromStorage(admin, photo.original_path);
  const developed = event.film_filter ? await applyFilmFilter(original) : original;

  const revealedPath = `${event.id}/revealed/${photo.id}.jpg`;
  const { error } = await admin.storage
    .from("photos")
    .upload(revealedPath, developed, { contentType: "image/jpeg", upsert: true });

  // Cache write failing shouldn't block serving the image.
  if (!error) {
    await admin.from("photos").update({ revealed_path: revealedPath }).eq("id", photo.id);
  }

  return developed;
}

/** Developed photo with the event watermark composited for downloads. */
export async function getDownloadVersion(
  admin: SupabaseClient,
  event: Event,
  photo: Photo
): Promise<Buffer> {
  const developed = await ensureRevealedVersion(admin, event, photo);
  if (!event.watermark_path) return developed;

  const { data, error } = await admin.storage
    .from("watermarks")
    .download(event.watermark_path);
  if (error || !data) return developed;

  return applyWatermark(developed, Buffer.from(await data.arrayBuffer()));
}
