"use client";

import { useTransition } from "react";
import { deleteEvent } from "../../actions";

export function DeleteButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const ok = window.confirm(
      "Delete this event? All photos are permanently removed for everyone."
    );
    if (!ok) return;
    startTransition(() => deleteEvent(eventId));
  }

  return (
    <button onClick={handleClick} disabled={isPending} className="btn-danger">
      {isPending ? "Deleting…" : "Delete event"}
    </button>
  );
}
