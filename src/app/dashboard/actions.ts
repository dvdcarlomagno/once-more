"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSlug } from "@/lib/slug";
import type { Event } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function requireOwnedEvent(eventId: string) {
  const { supabase, user } = await requireUser();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("ambassador_id", user.id)
    .maybeSingle();
  if (!event) redirect("/dashboard");
  return { supabase, user, event: event as Event };
}

export async function createEvent(formData: FormData) {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Event name is required");

  const shots = Math.min(100, Math.max(1, Number(formData.get("shots_per_person") ?? 5)));

  const { data, error } = await supabase
    .from("events")
    .insert({
      ambassador_id: user.id,
      name,
      slug: generateSlug(),
      description: String(formData.get("description") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      starts_at: String(formData.get("starts_at") ?? "").trim() || null,
      cover_url: String(formData.get("cover_url") ?? "").trim() || null,
      luma_url: String(formData.get("luma_url") ?? "").trim() || null,
      shots_per_person: shots,
      film_filter: formData.get("film_filter") === "on",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const watermark = formData.get("watermark") as File | null;
  if (watermark && watermark.size > 0) {
    await uploadWatermark(data.id, watermark);
  }

  redirect(`/dashboard/events/${data.id}`);
}

async function uploadWatermark(eventId: string, file: File) {
  if (file.type !== "image/png") throw new Error("Watermark must be a PNG");
  if (file.size > 2 * 1024 * 1024) throw new Error("Watermark must be under 2MB");

  const admin = createAdminClient();
  const path = `${eventId}/watermark.png`;
  const { error } = await admin.storage
    .from("watermarks")
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: "image/png",
      upsert: true,
    });
  if (error) throw new Error(error.message);

  await admin.from("events").update({ watermark_path: path }).eq("id", eventId);
}

export async function updateEventSettings(eventId: string, formData: FormData) {
  const { supabase } = await requireOwnedEvent(eventId);

  const shots = Math.min(100, Math.max(1, Number(formData.get("shots_per_person") ?? 5)));

  const { error } = await supabase
    .from("events")
    .update({
      name: String(formData.get("name") ?? "").trim() || undefined,
      shots_per_person: shots,
      film_filter: formData.get("film_filter") === "on",
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  const watermark = formData.get("watermark") as File | null;
  if (watermark && watermark.size > 0) {
    await uploadWatermark(eventId, watermark);
  }

  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function removeWatermark(eventId: string) {
  const { event } = await requireOwnedEvent(eventId);

  const admin = createAdminClient();
  if (event.watermark_path) {
    await admin.storage.from("watermarks").remove([event.watermark_path]);
  }
  await admin.from("events").update({ watermark_path: null }).eq("id", eventId);

  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function revealEvent(eventId: string) {
  const { supabase } = await requireOwnedEvent(eventId);

  const { error } = await supabase
    .from("events")
    .update({ revealed: true, revealed_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  const { event } = await requireOwnedEvent(eventId);

  const admin = createAdminClient();

  // Clean up storage before the cascade delete removes the rows.
  const { data: photos } = await admin
    .from("photos")
    .select("original_path, blurred_path, revealed_path")
    .eq("event_id", eventId);

  const paths = (photos ?? [])
    .flatMap((p) => [p.original_path, p.blurred_path, p.revealed_path])
    .filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    await admin.storage.from("photos").remove(paths);
  }
  if (event.watermark_path) {
    await admin.storage.from("watermarks").remove([event.watermark_path]);
  }

  await admin.from("events").delete().eq("id", eventId);

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
