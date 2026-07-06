import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canViewEvent, getDownloadVersion } from "@/lib/photos";
import type { Event, Photo } from "@/lib/types";

export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const admin = createAdminClient();
  const { data: photoData } = await admin
    .from("photos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!photoData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const photo = photoData as Photo;

  const { data: eventData } = await admin
    .from("events")
    .select("*")
    .eq("id", photo.event_id)
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

  try {
    const buffer = await getDownloadVersion(admin, event, photo);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "image/jpeg",
        "content-disposition": `attachment; filename="once-more-${photo.id.slice(0, 8)}.jpg"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Download unavailable" }, { status: 500 });
  }
}
