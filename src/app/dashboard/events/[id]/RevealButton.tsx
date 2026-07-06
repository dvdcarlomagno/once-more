"use client";

import { useTransition } from "react";
import { revealEvent } from "../../actions";

export function RevealButton({ eventId, photoCount }: { eventId: string; photoCount: number }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const ok = window.confirm(
      `Develop the roll? All ${photoCount} photos become visible to every participant. This can't be undone.`
    );
    if (!ok) return;
    startTransition(() => revealEvent(eventId));
  }

  return (
    <button onClick={handleClick} disabled={isPending} className="btn-primary">
      {isPending ? "Developing…" : "Reveal all photos"}
    </button>
  );
}
