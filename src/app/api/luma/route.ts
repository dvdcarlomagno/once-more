import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchLumaEvent } from "@/lib/luma";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
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
