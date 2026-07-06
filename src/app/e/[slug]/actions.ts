"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, participants } from "@/lib/db/schema";
import { participantCookieName } from "@/lib/participant";

export async function joinEvent(slug: string, formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "")
    .trim()
    .slice(0, 40);
  if (!displayName) throw new Error("Please enter a name");

  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);
  if (!event) throw new Error("Event not found");

  const [participant] = await db
    .insert(participants)
    .values({ eventId: event.id, displayName })
    .returning({ token: participants.token });

  const cookieStore = await cookies();
  cookieStore.set(participantCookieName(event.id), participant.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });

  redirect(`/e/${slug}/camera`);
}
