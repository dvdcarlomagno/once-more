import "server-only";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import type { Participant } from "@/lib/types";

export function participantCookieName(eventId: string) {
  return `om_p_${eventId}`;
}

/** Resolve the current participant for an event from their token cookie. */
export async function getParticipant(eventId: string): Promise<Participant | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(participantCookieName(eventId))?.value;
  if (!token) return null;

  const [participant] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.eventId, eventId), eq(participants.token, token)))
    .limit(1);

  return participant ?? null;
}
