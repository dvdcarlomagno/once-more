import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Participant } from "@/lib/types";

export function participantCookieName(eventId: string) {
  return `om_p_${eventId}`;
}

/** Resolve the current participant for an event from their token cookie. */
export async function getParticipant(eventId: string): Promise<Participant | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(participantCookieName(eventId))?.value;
  if (!token) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("participants")
    .select("*")
    .eq("event_id", eventId)
    .eq("token", token)
    .maybeSingle();

  return (data as Participant | null) ?? null;
}
