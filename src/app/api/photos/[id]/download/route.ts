import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, photos } from "@/lib/db/schema";
import { canViewEvent, getDownloadVersion } from "@/lib/photos";

export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
  if (!event.revealed) {
    return NextResponse.json({ error: "Not revealed yet" }, { status: 403 });
  }

  try {
    const buffer = await getDownloadVersion(event, photo);
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
