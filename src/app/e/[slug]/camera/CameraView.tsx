"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  slug: string;
  eventId: string;
  eventName: string;
  participantName: string;
  shotsTotal: number;
  initialShotsUsed: number;
  revealed: boolean;
};

type ShutterState = "idle" | "capturing" | "uploading";

export function CameraView({
  slug,
  eventId,
  eventName,
  participantName,
  shotsTotal,
  initialShotsUsed,
  revealed,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [shotsUsed, setShotsUsed] = useState(initialShotsUsed);
  const [shutter, setShutter] = useState<ShutterState>("idle");
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const shotsLeft = shotsTotal - shotsUsed;
  const rollFinished = shotsLeft <= 0;

  useEffect(() => {
    if (rollFinished) return;
    let cancelled = false;

    async function startCamera() {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (!cancelled) {
          setCameraError(
            "Camera access is needed to shoot. Check your browser permissions and reload."
          );
        }
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, rollFinished]);

  async function capture() {
    const video = videoRef.current;
    if (!video || shutter !== "idle" || rollFinished) return;

    setShutter("capturing");
    setFlash(true);
    setTimeout(() => setFlash(false), 120);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setShutter("idle");
      return;
    }
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob) {
      setShutter("idle");
      return;
    }

    setShutter("uploading");
    try {
      const res = await fetch(`/api/events/${eventId}/photos`, {
        method: "POST",
        body: blob,
        headers: { "content-type": "image/jpeg" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setShotsUsed(json.shotsUsed);
      setToast("Frame captured — developing in the shared roll");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Upload failed, try again");
    } finally {
      setShutter("idle");
      setTimeout(() => setToast(null), 2500);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      {/* Top plate */}
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{eventName}</p>
          <p className="font-mono text-[11px] text-muted">{participantName}</p>
        </div>
        <Link
          href={`/e/${slug}/gallery`}
          className="btn-ghost px-3 py-1.5 text-xs"
        >
          {revealed ? "Gallery" : "The roll"}
        </Link>
      </header>

      {/* Camera body */}
      <div className="mt-6 rounded-3xl border border-line bg-surface p-5 shadow-2xl">
        {/* Viewfinder — small glass window, DSLR style */}
        <div className="mx-auto max-w-[340px]">
          <div className="rounded-xl bg-black p-2.5 shadow-inner ring-1 ring-line">
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[#050505]">
              {rollFinished ? (
                <div className="flex size-full flex-col items-center justify-center gap-2 text-center">
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
                    roll finished
                  </p>
                  <p className="px-6 text-xs text-muted">
                    All {shotsTotal} frames shot. Wait for the reveal.
                  </p>
                </div>
              ) : cameraError ? (
                <div className="flex size-full items-center justify-center p-6 text-center">
                  <p className="text-xs text-danger">{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`size-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                  />
                  {/* Optical vignette + glass */}
                  <div className="pointer-events-none absolute inset-0 rounded-md shadow-[inset_0_0_40px_18px_rgba(0,0,0,0.75)]" />
                  {/* Focus brackets */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="size-10 border border-white/50 [clip-path:polygon(0_0,30%_0,30%_12%,12%_12%,12%_30%,0_30%,0_0,100%_0,100%_30%,88%_30%,88%_12%,70%_12%,70%_0,100%_0,100%_100%,70%_100%,70%_88%,88%_88%,88%_70%,100%_70%,100%_100%,0_100%,0_70%,12%_70%,12%_88%,30%_88%,30%_100%,0_100%)]" />
                  </div>
                  {/* Viewfinder readout */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/55 px-2.5 py-1 font-mono text-[10px] text-[#8ff0a4]">
                    <span>F2.8 1/125</span>
                    <span>ISO 400</span>
                    <span className="text-accent-soft">
                      [{String(shotsLeft).padStart(2, "0")}]
                    </span>
                  </div>
                  {/* Shutter flash */}
                  <div
                    className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-100 ${
                      flash ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </>
              )}
            </div>
          </div>

          {/* Frame counter window */}
          <div className="mt-4 flex items-center justify-between">
            <div className="rounded-md border border-line bg-surface-raised px-3 py-1.5">
              <span className="font-mono text-xs text-muted">frames left </span>
              <span className="font-mono text-sm text-accent">
                {String(Math.max(0, shotsLeft)).padStart(2, "0")}
              </span>
              <span className="font-mono text-xs text-muted">/{String(shotsTotal).padStart(2, "0")}</span>
            </div>
            {!rollFinished && (
              <button
                onClick={() => {
                  setCameraError(null);
                  setFacingMode((m) => (m === "environment" ? "user" : "environment"));
                }}
                className="rounded-md border border-line px-3 py-1.5 font-mono text-[11px] text-muted hover:text-foreground"
              >
                flip
              </button>
            )}
          </div>

          {/* Shutter button */}
          {!rollFinished && (
            <div className="mt-5 flex justify-center">
              <button
                onClick={capture}
                disabled={shutter !== "idle" || !!cameraError}
                aria-label="Take photo"
                className="group relative size-20 rounded-full border-4 border-line bg-surface-raised transition-transform active:scale-95 disabled:opacity-40"
              >
                <span className="absolute inset-2 rounded-full bg-danger transition-colors group-active:bg-danger/70" />
                {shutter === "uploading" && (
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] uppercase tracking-widest text-white">
                    dev…
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* No-preview reminder */}
      <p className="mt-4 text-center text-xs text-muted">
        No previews. No retakes. Every frame goes blurred into the shared roll.
      </p>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 mx-auto w-fit max-w-[90%] rounded-full border border-line bg-surface-raised px-4 py-2 text-xs shadow-xl">
          {toast}
        </div>
      )}
    </main>
  );
}
