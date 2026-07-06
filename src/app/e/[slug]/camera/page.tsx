import { notFound, redirect } from "next/navigation";
import { eq, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, photos } from "@/lib/db/schema";
import { getParticipant } from "@/lib/participant";
import { CameraView } from "./CameraView";

export default async function CameraPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  if (!event) notFound();

  const participant = await getParticipant(event.id);
  if (!participant) redirect(`/e/${slug}`);

  const [{ value: shotsUsed }] = await db
    .select({ value: count() })
    .from(photos)
    .where(eq(photos.participantId, participant.id));

  return (
    <CameraView
      slug={slug}
      eventId={event.id}
      eventName={event.name}
      participantName={participant.displayName}
      shotsTotal={event.shotsPerPerson}
      initialShotsUsed={shotsUsed}
      revealed={event.revealed}
    />
  );
}
