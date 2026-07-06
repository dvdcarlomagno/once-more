import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, photos } from "@/lib/db/schema";
import { canViewEvent, ensureRevealedVersion } from "@/lib/photos";
import { downloadBlob } from "@/lib/blob";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const variant = request.nextUrl.searchParams.get("v") ?? "blurred";

  const [photo] = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, photo.eventId))
    .limit(1);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
      buffer = await ensureRevealedVersion(event, photo);
    } else {
      buffer = await downloadBlob(photo.blurredUrl);
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
