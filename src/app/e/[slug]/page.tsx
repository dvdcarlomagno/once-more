import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParticipant } from "@/lib/participant";
import type { Event } from "@/lib/types";
import { joinEvent } from "./actions";

export default async function JoinPage({
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
  if (participant) {
    redirect(`/e/${slug}/camera`);
  }

  const joinAction = joinEvent.bind(null, slug);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <p className="text-center font-mono text-xs uppercase tracking-[0.35em] text-accent">
        you&apos;ve been handed a camera
      </p>

      <div className="card mt-6">
        {event.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_url}
            alt=""
            className="mb-5 aspect-video w-full rounded-xl object-cover"
          />
        )}
        <h1 className="text-2xl font-semibold">{event.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {event.starts_at
            ? new Date(event.starts_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : ""}
          {event.location ? ` · ${event.location}` : ""}
        </p>

        <ul className="mt-5 space-y-2 text-sm text-muted">
          <li>· You get {event.shots_per_person} shots. Make them count.</li>
          <li>· No previews, no retakes — every photo develops blurred.</li>
          <li>· The host reveals the whole roll at the end.</li>
        </ul>

        <form action={joinAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="display_name" className="label">
              Your name
            </label>
            <input
              id="display_name"
              name="display_name"
              required
              maxLength={40}
              placeholder="How should we label your shots?"
              className="input"
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Grab the camera
          </button>
        </form>
      </div>
    </main>
  );
}
