import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-accent">
        35mm &middot; do not open before reveal
      </p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
        once <span className="text-accent">more</span>
      </h1>
      <p className="mt-5 max-w-md text-balance text-muted">
        A shared disposable camera for community events. Everyone shoots a few
        frames, every shot stays blurred, and the whole roll develops together
        when the host reveals it.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link href="/login" className="btn-primary">
          Host an event
        </Link>
        <span className="text-sm text-muted">
          Joining? Scan your event&apos;s QR code.
        </span>
      </div>

      <footer className="absolute bottom-6 text-xs text-muted/60">
        open source &middot; built for Cursor ambassadors
      </footer>
    </main>
  );
}
