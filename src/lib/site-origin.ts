/**
 * Origin (scheme + host, no path, no trailing slash) used in Supabase auth redirects.
 *
 * Browser: prefers `window.location.origin` so dev, production and Vercel previews follow the
 * URL aberta; falls back to `NEXT_PUBLIC_SITE_URL` only if origin is empty (ex.: ambientes exóticos).
 *
 * Server: `NEXT_PUBLIC_SITE_URL`, else `VERCEL_URL` as `https://…` on Vercel.
 */
export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const live = window.location.origin;
    if (live) return live;
    if (configured) return configured;
    return "";
  }

  if (configured) return configured;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return "";
}
