import JSZip from "jszip";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canViewEvent, getDownloadVersion } from "@/lib/photos";
import type { Event, Participant, Photo } from "@/lib/types";

export const maxDuration = 300;

function safeName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
}

export async function GET(
  _request: NextRequest,
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const event = eventData as Event;

  if (!(await canViewEvent(event))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!event.revealed) {
    return NextResponse.json({ error: "Not revealed yet" }, { status: 403 });
  }

  const [{ data: photosData }, { data: participantsData }] = await Promise.all([
    admin
      .from("photos")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    admin.from("participants").select("*").eq("event_id", eventId),
  ]);

  const photos = (photosData ?? []) as Photo[];
  const participants = (participantsData ?? []) as Participant[];
  const nameById = new Map(participants.map((p) => [p.id, p.display_name]));

  if (photos.length === 0) {
    return NextResponse.json({ error: "No photos" }, { status: 404 });
  }

  const zip = new JSZip();

  // Sequential keeps memory in check; process concurrency in small batches.
  const BATCH = 4;
  for (let i = 0; i < photos.length; i += BATCH) {
    const batch = photos.slice(i, i + BATCH);
    const buffers = await Promise.all(
      batch.map((photo) => getDownloadVersion(admin, event, photo).catch(() => null))
    );
    batch.forEach((photo, j) => {
      const buffer = buffers[j];
      if (!buffer) return;
      const author = safeName(nameById.get(photo.participant_id) ?? "unknown");
      const index = String(i + j + 1).padStart(3, "0");
      zip.file(`${index}-${author}.jpg`, buffer);
    });
  }

  const archive = await zip.generateAsync({
    type: "nodebuffer",
    compression: "STORE", // JPEGs don't compress; skip the CPU burn
  });

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${safeName(event.name)}-photos.zip"`,
    },
  });
}
