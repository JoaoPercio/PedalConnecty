const AUTH_NEXT_KEY = "pc_auth_next";

const INVITE_PATH = /^\/convite\/[0-9a-f]{64}$/;

/**
 * Aceita só o retorno ao convite. Rejeita URLs absolutas e outros caminhos.
 */
export function sanitizeAuthNext(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let value = trimmed;
  if (value.includes("%")) {
    try {
      value = decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\") || value.includes("://")) return null;

  const path = value.split("?")[0]?.split("#")[0] ?? "";
  if (!INVITE_PATH.test(path)) return null;
  return path;
}

export function rememberAuthNext(raw: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const safe = sanitizeAuthNext(raw);
  if (!safe) return;
  try {
    sessionStorage.setItem(AUTH_NEXT_KEY, safe);
  } catch {
    // quota / modo privado
  }
}

export function peekAuthNext(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_NEXT_KEY);
    const safe = sanitizeAuthNext(raw);
    if (raw && !safe) sessionStorage.removeItem(AUTH_NEXT_KEY);
    return safe;
  } catch {
    return null;
  }
}

export function clearAuthNext(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AUTH_NEXT_KEY);
  } catch {
    // ignore
  }
}

export function postAuthPath(): string {
  return peekAuthNext() ?? "/home";
}

export function authPathWithNext(
  path: "/login" | "/register",
  next: string | null | undefined,
  extra?: Record<string, string>
): string {
  const params = new URLSearchParams(extra);
  const safe = sanitizeAuthNext(next) ?? peekAuthNext();
  if (safe) params.set("next", safe);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
