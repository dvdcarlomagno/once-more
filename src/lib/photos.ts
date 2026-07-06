import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { auth } from "@/auth";
import { getParticipant } from "@/lib/participant";
import { downloadBlob, uploadBlob } from "@/lib/blob";
import { applyFilmFilter, applyWatermark } from "@/lib/image";
import type { Event, Photo } from "@/lib/types";

/** Participant of the event or its ambassador — the only people who see photos. */
export async function canViewEvent(event: Event): Promise<boolean> {
  const participant = await getParticipant(event.id);
  if (participant) return true;

  const session = await auth();
  return session?.user?.id === event.ambassadorId;
}

/**
 * Returns the developed (post-reveal) version of a photo, processing and
 * caching it in blob storage on first request. The film filter is baked here.
 */
export async function ensureRevealedVersion(
  event: Event,
  photo: Photo
): Promise<Buffer> {
  if (!event.revealed) throw new Error("Not revealed");

  if (photo.revealedUrl) {
    return downloadBlob(photo.revealedUrl);
  }

  const original = await downloadBlob(photo.originalUrl);
  const developed = event.filmFilter ? await applyFilmFilter(original) : original;

  try {
    const revealedUrl = await uploadBlob(
      `${event.id}/revealed/${photo.id}.jpg`,
      developed,
      "image/jpeg"
    );
    await db.update(photos).set({ revealedUrl }).where(eq(photos.id, photo.id));
  } catch {
    // Cache write failing shouldn't block serving the image.
  }

  return developed;
}

/** Developed photo with the event watermark composited for downloads. */
export async function getDownloadVersion(
  event: Event,
  photo: Photo
): Promise<Buffer> {
  const developed = await ensureRevealedVersion(event, photo);
  if (!event.watermarkUrl) return developed;

  try {
    const watermark = await downloadBlob(event.watermarkUrl);
    return applyWatermark(developed, watermark);
  } catch {
    return developed;
  }
}
