// app/api/elevation/route.ts
//
// Ganho de elevação (m) de um traçado. Usa o OpenRouteService (ORS_API_KEY, só
// no servidor) e cai para o Open-Meteo (sem chave) se o ORS falhar.
// A Open-Elevation pública, usada antes, passou a exigir chave (HTTP 429).

import { NextResponse } from "next/server";

const ORS_ELEVATION_URL = "https://api.openrouteservice.org/elevation/line";
const OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
/** Open-Meteo aceita no máximo 100 coordenadas por requisição. */
const OPEN_METEO_CHUNK = 100;
const MAX_INPUT_POINTS = 20000;
/** Pontos amostrados ao longo do traçado (suficiente para o ganho total). */
const SAMPLE_POINTS = 200;
/** Ignora oscilações menores que isso (ruído do modelo de relevo SRTM). */
const NOISE_THRESHOLD_M = 3;
const TIMEOUT_MS = 10000;

type LatLng = [number, number];

function isLatLng(v: unknown): v is LatLng {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    Math.abs(v[0]) <= 90 &&
    Math.abs(v[1]) <= 180
  );
}

function samplePoints(coords: LatLng[]): LatLng[] {
  if (coords.length <= SAMPLE_POINTS) return coords;
  const step = (coords.length - 1) / (SAMPLE_POINTS - 1);
  const out: LatLng[] = [];
  for (let i = 0; i < SAMPLE_POINTS; i++) {
    out.push(coords[Math.round(i * step)]);
  }
  return out;
}

/** Soma das subidas com histerese: só conta quando sobe além do limiar. */
function elevationGain(elevations: number[]): number {
  if (elevations.length < 2) return 0;
  let gain = 0;
  let ref = elevations[0];
  for (let i = 1; i < elevations.length; i++) {
    const e = elevations[i];
    if (e - ref >= NOISE_THRESHOLD_M) {
      gain += e - ref;
      ref = e;
    } else if (ref - e >= NOISE_THRESHOLD_M) {
      ref = e;
    }
  }
  return Math.round(gain);
}

async function fetchOrs(points: LatLng[], apiKey: string): Promise<number[]> {
  const res = await fetch(ORS_ELEVATION_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      format_in: "polyline",
      format_out: "polyline",
      geometry: points.map(([lat, lng]) => [lng, lat]),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ORS ${res.status}`);
  const data = (await res.json()) as { geometry?: number[][] };
  const elevations = (data.geometry ?? []).map((p) => p[2]);
  if (elevations.length !== points.length || elevations.some((e) => !Number.isFinite(e))) {
    throw new Error("ORS: resposta inválida");
  }
  return elevations;
}

async function fetchOpenMeteo(points: LatLng[]): Promise<number[]> {
  const elevations: number[] = [];
  for (let i = 0; i < points.length; i += OPEN_METEO_CHUNK) {
    const chunk = points.slice(i, i + OPEN_METEO_CHUNK);
    const params = new URLSearchParams({
      latitude: chunk.map(([lat]) => lat.toFixed(5)).join(","),
      longitude: chunk.map(([, lng]) => lng.toFixed(5)).join(","),
    });
    const res = await fetch(`${OPEN_METEO_ELEVATION_URL}?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const data = (await res.json()) as { elevation?: number[] };
    if (!data.elevation || data.elevation.length !== chunk.length) {
      throw new Error("Open-Meteo: resposta inválida");
    }
    elevations.push(...data.elevation);
  }
  return elevations;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { coordinates } = (body ?? {}) as { coordinates?: unknown };
  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    coordinates.length > MAX_INPUT_POINTS ||
    !coordinates.every(isLatLng)
  ) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  const points = samplePoints(coordinates);
  const apiKey = process.env.ORS_API_KEY;

  let elevations: number[] | null = null;
  if (apiKey) {
    try {
      elevations = await fetchOrs(points, apiKey);
    } catch (err) {
      console.warn("[elevation] ORS falhou, usando Open-Meteo:", err);
    }
  }
  if (!elevations) {
    try {
      elevations = await fetchOpenMeteo(points);
    } catch (err) {
      console.error("[elevation] Open-Meteo falhou:", err);
      return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
    }
  }

  return NextResponse.json({ elevationGainM: elevationGain(elevations) });
}
