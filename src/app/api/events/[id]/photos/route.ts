import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParticipant } from "@/lib/participant";
import { makeBlurred, normalizeCapture } from "@/lib/image";
import type { Event } from "@/lib/types";

export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const admin = createAdminClient();

  const { data: eventData } = await admin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (!eventData) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const event = eventData as Event;

  if (event.revealed) {
    return NextResponse.json(
      { error: "The roll is already developed — no more shots" },
      { status: 409 }
    );
  }

  const participant = await getParticipant(eventId);
  if (!participant) {
    return NextResponse.json({ error: "Join the event first" }, { status: 401 });
  }

  const { count } = await admin
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", participant.id);
  const shotsUsed = count ?? 0;

  if (shotsUsed >= event.shots_per_person) {
    return NextResponse.json({ error: "No frames left on your roll" }, { status: 403 });
  }

  const raw = Buffer.from(await request.arrayBuffer());
  if (raw.length === 0 || raw.length > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  }

  let original: Buffer;
  let blurred: Buffer;
  try {
    original = await normalizeCapture(raw);
    blurred = await makeBlurred(original);
  } catch {
    return NextResponse.json({ error: "Could not process image" }, { status: 422 });
  }

  const photoId = crypto.randomUUID();
  const originalPath = `${eventId}/original/${photoId}.jpg`;
  const blurredPath = `${eventId}/blurred/${photoId}.jpg`;

  const [originalUpload, blurredUpload] = await Promise.all([
    admin.storage.from("photos").upload(originalPath, original, {
      contentType: "image/jpeg",
    }),
    admin.storage.from("photos").upload(blurredPath, blurred, {
      contentType: "image/jpeg",
    }),
  ]);

  if (originalUpload.error || blurredUpload.error) {
    return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
  }

  const { error: insertError } = await admin.from("photos").insert({
    id: photoId,
    event_id: eventId,
    participant_id: participant.id,
    original_path: originalPath,
    blurred_path: blurredPath,
  });

  if (insertError) {
    await admin.storage.from("photos").remove([originalPath, blurredPath]);
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }

  return NextResponse.json({ id: photoId, shotsUsed: shotsUsed + 1 });
}
