function normalizeOrigin(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\/$/, "");
}

/**
 * Origin genérico (ex.: links relativos ao host atual).
 */
export function getSiteOrigin(): string {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);

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

/**
 * Origin usado em `redirectTo` do Supabase (OAuth, reset de senha).
 *
 * **Prioriza `NEXT_PUBLIC_SITE_URL`**: o Supabase só aceita URLs que estejam na lista
 * "Redirect URLs" e alinhadas com o Site URL. Se `redirectTo` não bater com a lista,
 * o GoTrue costuma redirecionar para o Site URL do projeto (muitas vezes localhost).
 *
 * Em Vercel, define `NEXT_PUBLIC_SITE_URL=https://pedal-connect.vercel.app` (sem barra final).
 * Em local, deixa vazio ou `http://localhost:3000` no `.env.local`.
 */
export function getAuthRedirectOrigin(): string {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return "";
}
