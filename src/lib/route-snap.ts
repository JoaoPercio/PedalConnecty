/**
 * Cliente do roteamento de bicicleta (`/api/route-snap` → OpenRouteService).
 * Compartilhado entre o browser e a rota de API (sem dependências de React).
 */

export const ROUTE_SNAP_PROFILES = ["cycling", "mtb"] as const;
export type RouteSnapProfile = (typeof ROUTE_SNAP_PROFILES)[number];

export type RouteSnapFailure =
  | "not_configured"
  | "rate_limited"
  | "offline"
  | "failed";

export type RouteSnapResult =
  | { ok: true; coordinates: [number, number][] }
  | { ok: false; reason: RouteSnapFailure };

/**
 * Pede ao servidor o traçado entre dois pontos `[lat, lng]` seguindo vias
 * pedaláveis (ciclovias/ruas ou trilhas, conforme o perfil).
 */
export async function snapRouteSegment(
  profile: RouteSnapProfile,
  from: [number, number],
  to: [number, number]
): Promise<RouteSnapResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, reason: "offline" };
  }
  try {
    const res = await fetch("/api/route-snap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, coordinates: [from, to] }),
    });
    if (res.status === 503) return { ok: false, reason: "not_configured" };
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    if (!res.ok) return { ok: false, reason: "failed" };
    const data = (await res.json()) as { coordinates?: unknown };
    const coords = data.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      return { ok: false, reason: "failed" };
    }
    return { ok: true, coordinates: coords as [number, number][] };
  } catch {
    return { ok: false, reason: "offline" };
  }
}
