import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { fetchLumaEvent } from "@/lib/luma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const details = await fetchLumaEvent(url);
    return NextResponse.json(details);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch event";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
