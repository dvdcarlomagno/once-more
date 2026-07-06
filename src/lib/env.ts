export function siteUrl(requestOrigin?: string) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    requestOrigin ??
    "http://localhost:3000"
  );
}
