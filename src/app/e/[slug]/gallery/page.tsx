import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParticipant } from "@/lib/participant";
import type { Event, Participant, Photo } from "@/lib/types";
import { Gallery } from "@/components/Gallery";

export default async function EventGalleryPage({
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

  const [{ data: photosData }, { data: participantsData }] = await Promise.all([
    admin
      .from("photos")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true }),
    admin.from("participants").select("*").eq("event_id", event.id),
  ]);

  const photos = (photosData ?? []) as Photo[];
  const participants = (participantsData ?? []) as Participant[];
  const nameById = new Map(participants.map((p) => [p.id, p.display_name]));
  const galleryPhotos = photos.map((p) => ({
    ...p,
    participantName: nameById.get(p.participant_id) ?? "unknown",
  }));

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{event.name}</h1>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-muted">
            {event.revealed
              ? `the roll · ${photos.length} frames · revealed`
              : `the roll · ${photos.length} frames · developing`}
          </p>
        </div>
        <Link href={`/e/${slug}/camera`} className="btn-ghost px-3 py-1.5 text-xs">
          Camera
        </Link>
      </header>

      {!event.revealed && photos.length > 0 && (
        <p className="mb-5 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          Everything stays blurred until the host develops the roll. Check back
          after the event.
        </p>
      )}

      {event.revealed && photos.length > 0 && (
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
