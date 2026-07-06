"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { participantCookieName } from "@/lib/participant";
import type { Event } from "@/lib/types";

export async function joinEvent(slug: string, formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "")
    .trim()
    .slice(0, 40);
  if (!displayName) throw new Error("Please enter a name");

  const admin = createAdminClient();
  const { data: eventData } = await admin
    .from("events")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!eventData) throw new Error("Event not found");
  const event = eventData as Pick<Event, "id" | "slug">;

  const { data: participant, error } = await admin
    .from("participants")
    .insert({ event_id: event.id, display_name: displayName })
    .select("token")
    .single();
  if (error) throw new Error(error.message);

  const cookieStore = await cookies();
  cookieStore.set(participantCookieName(event.id), participant.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90, // photos should outlive the event night
    path: "/",
  });

  redirect(`/e/${slug}/camera`);
}
