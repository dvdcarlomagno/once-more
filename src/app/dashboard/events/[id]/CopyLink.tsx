"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      className="mt-1 block w-full truncate rounded-lg bg-surface-raised px-3 py-2 text-left font-mono text-xs text-accent-soft hover:bg-surface-raised/70"
      title="Copy link"
    >
      {copied ? "Copied!" : url}
    </button>
  );
}
