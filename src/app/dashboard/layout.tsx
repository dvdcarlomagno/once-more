import Link from "next/link";
import { signOut } from "./actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-20">
      <header className="flex items-center justify-between py-6">
        <Link href="/dashboard" className="font-mono text-sm uppercase tracking-[0.3em] hover:text-accent">
          once <span className="text-accent">more</span>
        </Link>
        <form action={signOut}>
          <button type="submit" className="text-xs text-muted hover:text-foreground">
            Sign out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
