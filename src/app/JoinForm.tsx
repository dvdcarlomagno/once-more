"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = code.trim().toLowerCase().replace(/\s+/g, "");
    if (!slug) return;
    setPending(true);
    router.push(`/e/${encodeURIComponent(slug)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <label htmlFor="code" className="label text-center">
        Enter your event code
      </label>
      <div className="flex gap-2">
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. k7m2p9qx"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="input text-center font-mono tracking-[0.2em]"
        />
        <button type="submit" disabled={pending} className="btn-primary shrink-0">
          {pending ? "…" : "Join"}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        or scan the event&apos;s QR code with your phone
      </p>
    </form>
  );
}
