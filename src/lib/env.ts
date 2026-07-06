export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function siteUrl(requestOrigin?: string) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin ?? "http://localhost:3000";
}
