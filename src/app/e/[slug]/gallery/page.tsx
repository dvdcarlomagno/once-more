import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, participants, photos } from "@/lib/db/schema";
import { getParticipant } from "@/lib/participant";
import { Gallery } from "@/components/Gallery";

export default async function EventGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  if (!event) notFound();

  const participant = await getParticipant(event.id);
  if (!participant) redirect(`/e/${slug}`);

  const [photoRows, participantRows] = await Promise.all([
    db.select().from(photos).where(eq(photos.eventId, event.id)).orderBy(asc(photos.createdAt)),
    db.select().from(participants).where(eq(participants.eventId, event.id)),
  ]);

  const nameById = new Map(participantRows.map((p) => [p.id, p.displayName]));
  const galleryPhotos = photoRows.map((p) => ({
    ...p,
    participantName: nameById.get(p.participantId) ?? "unknown",
  }));

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{event.name}</h1>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-muted">
            the roll · {photoRows.length} frames ·{" "}
            {event.revealed ? "revealed" : "developing"}
          </p>
        </div>
        <Link href={`/e/${slug}/camera`} className="btn-ghost px-3 py-1.5 text-xs">
          Camera
        </Link>
      </header>

      {!event.revealed && photoRows.length > 0 && (
        <p className="mb-5 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          Everything stays blurred until the host develops the roll. Check back
          after the event.
        </p>
      )}

      {event.revealed && photoRows.length > 0 && (
        <div className="mb-5">
          <a href={`/api/events/${event.id}/zip`} className="btn-primary">
            Download all (.zip)
          </a>
        </div>
      )}

      <Gallery photos={galleryPhotos} revealed={event.revealed} />
    </main>
  );
}
