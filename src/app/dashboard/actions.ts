"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, photos } from "@/lib/db/schema";
import { auth, signOut as authSignOut } from "@/auth";
import { uploadBlob, removeBlobs } from "@/lib/blob";
import { generateSlug } from "@/lib/slug";
import type { Event } from "@/lib/types";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

async function requireOwnedEvent(eventId: string): Promise<Event> {
  const userId = await requireUserId();
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.ambassadorId, userId)))
    .limit(1);
  if (!event) redirect("/dashboard");
  return event;
}

async function uploadWatermark(eventId: string, file: File) {
  if (file.type !== "image/png") throw new Error("Watermark must be a PNG");
  if (file.size > 2 * 1024 * 1024) throw new Error("Watermark must be under 2MB");

  const url = await uploadBlob(
    `${eventId}/watermark.png`,
    Buffer.from(await file.arrayBuffer()),
    "image/png"
  );
  await db.update(events).set({ watermarkUrl: url }).where(eq(events.id, eventId));
}

export async function createEvent(formData: FormData) {
  const userId = await requireUserId();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Event name is required");

  const shots = Math.min(100, Math.max(1, Number(formData.get("shots_per_person") ?? 5)));
  const startsAtRaw = String(formData.get("starts_at") ?? "").trim();

  const [event] = await db
    .insert(events)
    .values({
      ambassadorId: userId,
      name,
      slug: generateSlug(),
      description: String(formData.get("description") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
      coverUrl: String(formData.get("cover_url") ?? "").trim() || null,
      lumaUrl: String(formData.get("luma_url") ?? "").trim() || null,
      shotsPerPerson: shots,
      filmFilter: formData.get("film_filter") === "on",
    })
    .returning({ id: events.id });

  const watermark = formData.get("watermark") as File | null;
  if (watermark && watermark.size > 0) {
    await uploadWatermark(event.id, watermark);
  }

  redirect(`/dashboard/events/${event.id}`);
}

export async function updateEventSettings(eventId: string, formData: FormData) {
  await requireOwnedEvent(eventId);

  const shots = Math.min(100, Math.max(1, Number(formData.get("shots_per_person") ?? 5)));
  const name = String(formData.get("name") ?? "").trim();

  await db
    .update(events)
    .set({
      ...(name ? { name } : {}),
      shotsPerPerson: shots,
      filmFilter: formData.get("film_filter") === "on",
    })
    .where(eq(events.id, eventId));

  const watermark = formData.get("watermark") as File | null;
  if (watermark && watermark.size > 0) {
    await uploadWatermark(eventId, watermark);
  }

  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function removeWatermark(eventId: string) {
  const event = await requireOwnedEvent(eventId);
  await removeBlobs([event.watermarkUrl]);
  await db.update(events).set({ watermarkUrl: null }).where(eq(events.id, eventId));
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function revealEvent(eventId: string) {
  await requireOwnedEvent(eventId);
  await db
    .update(events)
    .set({ revealed: true, revealedAt: new Date() })
    .where(eq(events.id, eventId));
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  const event = await requireOwnedEvent(eventId);

  const eventPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.eventId, eventId));

  await removeBlobs([
    ...eventPhotos.flatMap((p) => [p.originalUrl, p.blurredUrl, p.revealedUrl]),
    event.watermarkUrl,
  ]);

  // participants + photos cascade via FK on event delete.
  await db.delete(events).where(eq(events.id, eventId));

  redirect("/dashboard");
}

export async function signOut() {
  await authSignOut({ redirectTo: "/" });
}
