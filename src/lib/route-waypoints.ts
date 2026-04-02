import type { RouteWaypoint } from "@/components/pedals/RouteMap";

export type RouteWaypointStored = {
  name: string;
  lat: number;
  lng: number;
};

/**
 * Converte JSON do banco em pontos de parada com `id` estável para o mapa.
 */
export function parseStoredRouteWaypoints(raw: unknown): RouteWaypoint[] {
  if (!Array.isArray(raw)) return [];
  const out: RouteWaypoint[] = [];
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    if (!w || typeof w !== "object") continue;
    const o = w as Record<string, unknown>;
    const lat = Number(o.lat);
    const lng = Number(o.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const nameRaw = o.name;
    const name =
      typeof nameRaw === "string" && nameRaw.trim()
        ? nameRaw.trim().slice(0, 120)
        : `Parada ${out.length + 1}`;
    const idRaw = o.id;
    const id =
      typeof idRaw === "string" && idRaw.length > 0
        ? idRaw
        : globalThis.crypto?.randomUUID?.() ??
          `wp-${i}-${lat.toFixed(5)}-${lng.toFixed(5)}`;
    out.push({ id, name, lat, lng });
  }
  return out;
}

export function serializeWaypointsForDb(
  waypoints: RouteWaypoint[]
): RouteWaypointStored[] {
  return waypoints.map((w, i) => ({
    name: (w.name.trim() || `Parada ${i + 1}`).slice(0, 120),
    lat: w.lat,
    lng: w.lng,
  }));
}
