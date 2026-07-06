import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParticipant } from "@/lib/participant";
import type { Event } from "@/lib/types";
import { CameraView } from "./CameraView";

export default async function CameraPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const admin = createAdminClient();
  const { data } = await admin.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const event = data as Event;

  const participant = await getParticipant(event.id);
  if (!participant) redirect(`/e/${slug}`);

  const { count } = await admin
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", participant.id);

  const shotsUsed = count ?? 0;

  return (
    <CameraView
      slug={slug}
      eventId={event.id}
      eventName={event.name}
      participantName={participant.display_name}
      shotsTotal={event.shots_per_person}
      initialShotsUsed={shotsUsed}
      revealed={event.revealed}
    />
  );
}
