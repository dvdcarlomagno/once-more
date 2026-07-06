import Link from "next/link";
import { sendMagicLink } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string; error?: string }>;
}) {
  const { check, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Link
        href="/"
        className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-muted hover:text-accent"
      >
        &larr; once more
      </Link>

      <div className="card">
        <h1 className="text-2xl font-semibold">Host sign in</h1>
        <p className="mt-2 text-sm text-muted">
          We&apos;ll email you a magic link. No password to remember.
        </p>

        {check ? (
          <div className="mt-6 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
            Check your inbox for the sign-in link. You can close this tab.
          </div>
        ) : (
          <form action={sendMagicLink} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="input"
              />
            </div>
            {error && (
              <p className="text-sm text-danger">
                Something went wrong sending the link. Try again.
              </p>
            )}
            <button type="submit" className="btn-primary w-full">
              Send magic link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
