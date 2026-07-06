import type { Photo } from "@/lib/types";

type GalleryPhoto = Photo & { participantName: string };

export function Gallery({
  photos,
  revealed,
}: {
  photos: GalleryPhoto[];
  revealed: boolean;
}) {
  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          no frames yet
        </p>
        <p className="mt-2 text-sm text-muted">The roll is empty. Go shoot something.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo, i) => (
        <li key={photo.id} className="group">
          {/* Polaroid-style frame */}
          <div className="rounded-lg bg-[#f5efe2] p-2 pb-7 shadow-lg">
            <div className="relative aspect-square overflow-hidden rounded-sm bg-[#0e0c0a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${photo.id}/image?v=${revealed ? "clear" : "blurred"}`}
                alt={revealed ? `Photo by ${photo.participantName}` : "Undeveloped photo"}
                loading="lazy"
                className="size-full object-cover"
              />
              {!revealed && (
                <span className="absolute inset-x-0 bottom-1 text-center font-mono text-[9px] uppercase tracking-widest text-white/70">
                  developing
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between px-0.5">
              <span className="truncate font-mono text-[10px] text-[#6b6250]">
                {photo.participantName} · #{String(i + 1).padStart(2, "0")}
              </span>
              {revealed && (
                <a
                  href={`/api/photos/${photo.id}/download`}
                  className="font-mono text-[10px] uppercase text-[#8a6d2f] underline-offset-2 hover:underline"
                >
                  save
                </a>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
