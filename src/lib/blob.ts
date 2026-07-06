import "server-only";
import { put, del } from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Uploads bytes to Vercel Blob and returns the URL we persist in the DB.
 *
 * Objects are technically public-read, but every URL carries an unguessable
 * random suffix and we NEVER hand raw blob URLs to the browser. All images
 * are proxied through our API routes, which is what preserves the
 * blur-until-reveal guarantee.
 */
export async function uploadBlob(
  pathname: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const result = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: true,
    token,
  });
  return result.url;
}

export async function downloadBlob(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Blob fetch failed (${res.status}) for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function removeBlobs(urls: (string | null | undefined)[]) {
  const valid = urls.filter((u): u is string => Boolean(u));
  if (valid.length === 0) return;
  try {
    await del(valid, { token });
  } catch {
    // Best-effort cleanup — a failed delete shouldn't block the user action.
  }
}
