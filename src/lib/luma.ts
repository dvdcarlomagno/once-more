import "server-only";

export type LumaEventDetails = {
  name: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  coverUrl: string | null;
  url: string;
};

const ALLOWED_HOSTS = new Set(["lu.ma", "www.lu.ma", "luma.com", "www.luma.com"]);

/**
 * Pulls public event details from a Luma event page by reading its
 * JSON-LD metadata. No API key needed — full API sync is on the roadmap.
 */
export async function fetchLumaEvent(rawUrl: string): Promise<LumaEventDetails> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }

  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error("Only lu.ma / luma.com event links are supported.");
  }

  const res = await fetch(url.toString(), {
    headers: { "user-agent": "once-more/1.0 (+https://github.com)" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Luma returned ${res.status} — is the event page public?`);
  }

  const html = await res.text();
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];

  for (const match of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }

    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of candidates) {
      const event = item as Record<string, unknown>;
      const type = event["@type"];
      const types = Array.isArray(type) ? type : [type];
      if (!types.some((t) => typeof t === "string" && t.includes("Event"))) continue;

      const image = event.image;
      const locationValue = event.location as
        | { name?: string; address?: { addressLocality?: string } | string }
        | string
        | undefined;

      let location: string | null = null;
      if (typeof locationValue === "string") {
        location = locationValue;
      } else if (locationValue) {
        const address =
          typeof locationValue.address === "string"
            ? locationValue.address
            : locationValue.address?.addressLocality;
        location = [locationValue.name, address].filter(Boolean).join(", ") || null;
      }

      return {
        name: String(event.name ?? "Untitled event"),
        description: typeof event.description === "string" ? event.description : null,
        location,
        startsAt: typeof event.startDate === "string" ? event.startDate : null,
        coverUrl: Array.isArray(image)
          ? String(image[0])
          : typeof image === "string"
            ? image
            : null,
        url: url.toString(),
      };
    }
  }

  throw new Error("Couldn't read event details from that page. Is it public?");
}
