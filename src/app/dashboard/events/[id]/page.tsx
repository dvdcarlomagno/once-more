import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";
import type { Event, Participant, Photo } from "@/lib/types";
import { Gallery } from "@/components/Gallery";
import { updateEventSettings, removeWatermark } from "../../actions";
import { RevealButton } from "./RevealButton";
import { DeleteButton } from "./DeleteButton";
import { CopyLink } from "./CopyLink";

export default async function EventAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const event = data as Event;

  const admin = createAdminClient();
  const [{ data: photosData }, { data: participantsData }] = await Promise.all([
    admin
      .from("photos")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
    admin.from("participants").select("*").eq("event_id", id),
  ]);

  const photos = (photosData ?? []) as Photo[];
  const participants = (participantsData ?? []) as Participant[];
  const nameById = new Map(participants.map((p) => [p.id, p.display_name]));
  const galleryPhotos = photos.map((p) => ({
    ...p,
    participantName: nameById.get(p.participant_id) ?? "unknown",
  }));

  const headerList = await headers();
  const host = headerList.get("host");
  const origin = host ? `${host.includes("localhost") ? "http" : "https"}://${host}` : undefined;
  const joinUrl = `${siteUrl(origin)}/e/${event.slug}`;
  const qrDataUrl = await QRCode.toDataURL(joinUrl, {
    width: 480,
    margin: 1,
    color: { dark: "#141210", light: "#f5efe2" },
  });

  const updateAction = updateEventSettings.bind(null, event.id);
  const removeWatermarkAction = removeWatermark.bind(null, event.id);

  return (
    <main className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
          &larr; Back to events
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{event.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {event.starts_at
                ? new Date(event.starts_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "No date"}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest ${
              event.revealed
                ? "border-accent/50 text-accent"
                : "border-line text-muted"
            }`}
          >
            {event.revealed ? "revealed" : "developing"}
          </span>
        </div>
      </div>

      {/* QR + stats */}
      <section className="card">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR code to join ${event.name}`}
            className="size-44 rounded-xl"
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="label">Guests scan to join</h2>
            <CopyLink url={joinUrl} />
            <dl className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-surface-raised p-3">
                <dt className="text-xs text-muted">Participants</dt>
                <dd className="mt-1 font-mono text-xl">{participants.length}</dd>
              </div>
              <div className="rounded-lg bg-surface-raised p-3">
                <dt className="text-xs text-muted">Frames shot</dt>
                <dd className="mt-1 font-mono text-xl">{photos.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Reveal / downloads */}
      <section className="card">
        <h2 className="label">The roll</h2>
        {event.revealed ? (
          <div className="flex flex-wrap items-center gap-3">
            <a href={`/api/events/${event.id}/zip`} className="btn-primary">
              Download all (.zip)
            </a>
            <p className="text-sm text-muted">
              Revealed{" "}
              {event.revealed_at
                ? new Date(event.revealed_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : ""}
              . Everyone can now see and download every photo.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <RevealButton eventId={event.id} photoCount={photos.length} />
            <p className="text-sm text-muted">
              Photos stay blurred for everyone until you develop the roll.
            </p>
          </div>
        )}
      </section>

      {/* Settings */}
      <section className="card">
        <h2 className="label">Settings</h2>
        <form action={updateAction} className="space-y-4">
          <div>
            <label htmlFor="name" className="label">
              Event name
            </label>
            <input id="name" name="name" defaultValue={event.name} className="input" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="shots_per_person" className="label">
                Shots per person
              </label>
              <input
                id="shots_per_person"
                name="shots_per_person"
                type="number"
                min={1}
                max={100}
                defaultValue={event.shots_per_person}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="watermark" className="label">
                {event.watermark_path ? "Replace watermark PNG" : "Watermark PNG"}
              </label>
              <input
                id="watermark"
                name="watermark"
                type="file"
                accept="image/png"
                className="input file:mr-3 file:rounded file:border-0 file:bg-accent/20 file:px-2 file:py-1 file:text-xs file:text-accent"
              />
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="film_filter"
              defaultChecked={event.film_filter}
              disabled={event.revealed}
              className="size-4 accent-[#e8a33d]"
            />
            <span>
              Film filter
              {event.revealed && (
                <span className="text-muted"> — locked after reveal</span>
              )}
            </span>
          </label>
          <button type="submit" className="btn-ghost">
            Save settings
          </button>
        </form>
        {event.watermark_path && (
          <form action={removeWatermarkAction} className="mt-3">
            <button type="submit" className="text-xs text-muted underline-offset-2 hover:text-danger hover:underline">
              Remove current watermark
            </button>
          </form>
        )}
      </section>

      {/* Gallery */}
      <section>
        <h2 className="label">Shared gallery</h2>
        <Gallery photos={galleryPhotos} revealed={event.revealed} />
      </section>

      <section className="flex justify-end border-t border-line pt-6">
        <DeleteButton eventId={event.id} />
      </section>
    </main>
  );
}
