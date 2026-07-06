"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createEvent } from "../actions";

type LumaDetails = {
  name: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  coverUrl: string | null;
  url: string;
};

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function NewEventPage() {
  const [lumaUrl, setLumaUrl] = useState("");
  const [lumaStatus, setLumaStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [lumaError, setLumaError] = useState<string | null>(null);
  const [details, setDetails] = useState<LumaDetails | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function importFromLuma() {
    if (!lumaUrl.trim()) return;
    setLumaStatus("loading");
    setLumaError(null);
    try {
      const res = await fetch(`/api/luma?url=${encodeURIComponent(lumaUrl.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setDetails(json);
      setLumaStatus("done");
    } catch (err) {
      setLumaError(err instanceof Error ? err.message : "Import failed");
      setLumaStatus("error");
    }
  }

  function handleSubmit(formData: FormData) {
    setSubmitError(null);
    startTransition(async () => {
      try {
        await createEvent(formData);
      } catch (err) {
        // Next.js redirects throw — let them through.
        const digest = (err as { digest?: string })?.digest;
        if (digest?.startsWith("NEXT_REDIRECT")) throw err;
        setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <main>
      <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
        &larr; Back to events
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">New event</h1>

      <section className="card mt-6">
        <h2 className="label">Import from Luma (optional)</h2>
        <div className="flex gap-2">
          <input
            type="url"
            value={lumaUrl}
            onChange={(e) => setLumaUrl(e.target.value)}
            placeholder="https://lu.ma/your-event"
            className="input"
          />
          <button
            type="button"
            onClick={importFromLuma}
            disabled={lumaStatus === "loading"}
            className="btn-ghost shrink-0"
          >
            {lumaStatus === "loading" ? "Importing…" : "Import"}
          </button>
        </div>
        {lumaError && <p className="mt-2 text-sm text-danger">{lumaError}</p>}
        {lumaStatus === "done" && (
          <p className="mt-2 text-sm text-accent">
            Imported &ldquo;{details?.name}&rdquo; — review below and save.
          </p>
        )}
      </section>

      <form action={handleSubmit} className="card mt-4 space-y-5" key={details?.url ?? "manual"}>
        <input type="hidden" name="luma_url" value={details?.url ?? ""} />
        <input type="hidden" name="cover_url" value={details?.coverUrl ?? ""} />

        <div>
          <label htmlFor="name" className="label">
            Event name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={details?.name ?? ""}
            placeholder="Cursor Meetup Milano"
            className="input"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="starts_at" className="label">
              Date &amp; time
            </label>
            <input
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              defaultValue={toDatetimeLocal(details?.startsAt ?? null)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="location" className="label">
              Location
            </label>
            <input
              id="location"
              name="location"
              defaultValue={details?.location ?? ""}
              placeholder="Talent Garden, Milano"
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={details?.description ?? ""}
            className="input resize-none"
          />
        </div>

        <hr className="border-line" />

        <div className="grid gap-5 sm:grid-cols-2">
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
              defaultValue={5}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="watermark" className="label">
              Watermark PNG (optional)
            </label>
            <input
              id="watermark"
              name="watermark"
              type="file"
              accept="image/png"
              className="input file:mr-3 file:rounded file:border-0 file:bg-accent/20 file:px-2 file:py-1 file:text-xs file:text-accent"
            />
            <p className="mt-1.5 text-xs text-muted">
              Applied semi-transparent, bottom-right, on every download.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="film_filter"
            defaultChecked
            className="size-4 accent-[#e8a33d]"
          />
          <span>
            Film filter{" "}
            <span className="text-muted">— grainy warm old-camera look, baked in at reveal</span>
          </span>
        </label>

        {submitError && <p className="text-sm text-danger">{submitError}</p>}

        <button type="submit" disabled={isPending} className="btn-primary w-full">
          {isPending ? "Creating…" : "Create event"}
        </button>
      </form>
    </main>
  );
}
