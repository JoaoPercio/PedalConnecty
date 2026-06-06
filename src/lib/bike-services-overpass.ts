/** Bike-related OSM place kinds (Portuguese UI labels). */
export type BikeServiceKind = "loja" | "aluguel" | "oficina" | "estacao";

export interface BikeServicePlace {
  id: number;
  osmType: "node" | "way" | "relation";
  name: string;
  lat: number;
  lng: number;
  kind: BikeServiceKind;
  tags: Record<string, string>;
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const MAX_RESULTS = 100;

export function kindLabel(kind: BikeServiceKind): string {
  switch (kind) {
    case "loja":
      return "Loja";
    case "aluguel":
      return "Aluguel";
    case "oficina":
      return "Oficina";
    case "estacao":
      return "Estação de reparo";
    default:
      return "Serviço";
  }
}

/**
 * Haversine distance in km between two WGS84 points.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function classify(tags: Record<string, string>): BikeServiceKind {
  if (tags.amenity === "bicycle_repair_station") return "estacao";
  if (tags.amenity === "bicycle_rental") return "aluguel";
  if (tags.shop === "bicycle") return "loja";
  if (
    tags["service:bicycle"] === "yes" ||
    tags["service:bicycle"] === "retail" ||
    tags["service:bicycle"] === "repair"
  ) {
    return "oficina";
  }
  return "loja";
}

function getCoords(el: OverpassElement): { lat: number; lng: number } | null {
  if (el.type === "node" && el.lat != null && el.lon != null) {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center?.lat != null && el.center?.lon != null) {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  return null;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

export function buildOverpassQuery(lat: number, lng: number): string {
  return `[out:json][timeout:60];
(
  node["shop"="bicycle"](around:30000,${lat},${lng});
  way["shop"="bicycle"](around:30000,${lat},${lng});
  node["amenity"="bicycle_rental"](around:10000,${lat},${lng});
  way["amenity"="bicycle_rental"](around:10000,${lat},${lng});
  node["service:bicycle"="yes"](around:10000,${lat},${lng});
  way["service:bicycle"="yes"](around:10000,${lat},${lng});
  node["amenity"="bicycle_repair_station"](around:10000,${lat},${lng});
  way["amenity"="bicycle_repair_station"](around:10000,${lat},${lng});
);
out center;`;
}

export async function fetchBikeServices(
  lat: number,
  lng: number
): Promise<{ places: BikeServicePlace[]; error: string | null }> {
  const query = buildOverpassQuery(lat, lng);

  try {
    const res = await fetch("/api/bike-services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      return { places: [], error: "http" };
    }

    const json = (await res.json()) as OverpassResponse;
    const raw = json.elements ?? [];

    const places: BikeServicePlace[] = [];
    const seen = new Set<string>();

    for (const el of raw) {
      if (el.type !== "node" && el.type !== "way" && el.type !== "relation") {
        continue;
      }
      const coords = getCoords(el);
      if (!coords) continue;

      const tags = el.tags ?? {};
      const kind = classify(tags);
      const name = (tags.name ?? "").trim() || "Sem nome";
      const key = `${el.type}:${el.id}`;

      if (seen.has(key)) continue;
      seen.add(key);

      places.push({
        id: el.id,
        osmType: el.type,
        name,
        lat: coords.lat,
        lng: coords.lng,
        kind,
        tags,
      });

      if (places.length >= MAX_RESULTS) break;
    }

    return { places, error: null };
  } catch {
    return { places: [], error: "network" };
  }
}
