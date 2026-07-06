import JSZip from "jszip";
import { NextResponse, type NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, participants, photos } from "@/lib/db/schema";
import { canViewEvent, getDownloadVersion } from "@/lib/photos";

export const maxDuration = 300;

function safeName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await canViewEvent(event))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!event.revealed) {
    return NextResponse.json({ error: "Not revealed yet" }, { status: 403 });
  }

  const [photoRows, participantRows] = await Promise.all([
    db.select().from(photos).where(eq(photos.eventId, eventId)).orderBy(asc(photos.createdAt)),
    db.select().from(participants).where(eq(participants.eventId, eventId)),
  ]);

  const nameById = new Map(participantRows.map((p) => [p.id, p.displayName]));

  if (photoRows.length === 0) {
    return NextResponse.json({ error: "No photos" }, { status: 404 });
  }

  const zip = new JSZip();

  const BATCH = 4;
  for (let i = 0; i < photoRows.length; i += BATCH) {
    const batch = photoRows.slice(i, i + BATCH);
    const buffers = await Promise.all(
      batch.map((photo) => getDownloadVersion(event, photo).catch(() => null))
    );
    batch.forEach((photo, j) => {
      const buffer = buffers[j];
      if (!buffer) return;
      const author = safeName(nameById.get(photo.participantId) ?? "unknown");
      const index = String(i + j + 1).padStart(3, "0");
      zip.file(`${index}-${author}.jpg`, buffer);
    });
  }

  const archive = await zip.generateAsync({
    type: "nodebuffer",
    compression: "STORE",
  });

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${safeName(event.name)}-photos.zip"`,
    },
  });
}
