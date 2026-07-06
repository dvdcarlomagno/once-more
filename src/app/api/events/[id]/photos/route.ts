import { NextResponse, type NextRequest } from "next/server";
import { eq, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, photos } from "@/lib/db/schema";
import { getParticipant } from "@/lib/participant";
import { uploadBlob, removeBlobs } from "@/lib/blob";
import { makeBlurred, normalizeCapture } from "@/lib/image";

export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

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

  const [{ value: shotsUsed }] = await db
    .select({ value: count() })
    .from(photos)
    .where(eq(photos.participantId, participant.id));

  if (shotsUsed >= event.shotsPerPerson) {
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

  let originalUrl: string;
  let blurredUrl: string;
  try {
    [originalUrl, blurredUrl] = await Promise.all([
      uploadBlob(`${eventId}/original/${photoId}.jpg`, original, "image/jpeg"),
      uploadBlob(`${eventId}/blurred/${photoId}.jpg`, blurred, "image/jpeg"),
    ]);
  } catch {
    return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
  }

  try {
    await db.insert(photos).values({
      id: photoId,
      eventId,
      participantId: participant.id,
      originalUrl,
      blurredUrl,
    });
  } catch {
    await removeBlobs([originalUrl, blurredUrl]);
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }

  return NextResponse.json({ id: photoId, shotsUsed: shotsUsed + 1 });
}
