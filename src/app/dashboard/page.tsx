import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const rows = userId
    ? await db
        .select()
        .from(events)
        .where(eq(events.ambassadorId, userId))
        .orderBy(desc(events.createdAt))
    : [];

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your events</h1>
        <Link href="/dashboard/new" className="btn-primary">
          New event
        </Link>
      </div>

      {rows.length === 0 ? (
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
          {rows.map((event) => (
            <li key={event.id}>
              <Link
                href={`/dashboard/events/${event.id}`}
                className="card flex items-center justify-between transition-colors hover:border-accent/50"
              >
                <div>
                  <p className="font-medium">{event.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {event.startsAt
                      ? new Date(event.startsAt).toLocaleDateString(undefined, {
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
