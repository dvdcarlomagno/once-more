import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  const events = (data ?? []) as Event[];

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your events</h1>
        <Link href="/dashboard/new" className="btn-primary">
          New event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card mt-8 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            no film loaded
          </p>
          <p className="mt-3 text-muted">
            Create your first event and hand every guest a disposable camera.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/dashboard/events/${event.id}`}
                className="card flex items-center justify-between transition-colors hover:border-accent/50"
              >
                <div>
                  <p className="font-medium">{event.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {event.starts_at
                      ? new Date(event.starts_at).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })
                      : "No date"}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </div>
                <span
                  className={`font-mono text-[11px] uppercase tracking-widest ${
                    event.revealed ? "text-accent" : "text-muted"
                  }`}
                >
                  {event.revealed ? "revealed" : "developing"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
