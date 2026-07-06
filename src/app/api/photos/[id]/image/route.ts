import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canViewEvent, downloadFromStorage, ensureRevealedVersion } from "@/lib/photos";
import type { Event, Photo } from "@/lib/types";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const variant = request.nextUrl.searchParams.get("v") ?? "blurred";

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

  try {
    let buffer: Buffer;
    if (variant === "clear") {
      // The reveal rule lives here: clear images only exist after the host reveals.
      if (!event.revealed) {
        return NextResponse.json({ error: "Not revealed yet" }, { status: 403 });
      }
      buffer = await ensureRevealedVersion(admin, event, photo);
    } else {
      buffer = await downloadFromStorage(admin, photo.blurred_path);
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image unavailable" }, { status: 500 });
  }
}
