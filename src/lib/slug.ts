// Unambiguous alphabet (no 0/O, 1/l/I) — these codes end up in QR links.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateSlug(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
