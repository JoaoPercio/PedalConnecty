// app/api/route-snap/route.ts
//
// Liga dois (ou mais) pontos seguindo vias pedaláveis via OpenRouteService.
// A chave fica só no servidor (ORS_API_KEY).

import { NextResponse } from "next/server";
import { ROUTE_SNAP_PROFILES, type RouteSnapProfile } from "@/lib/route-snap";

const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions";

const ORS_PROFILE: Record<RouteSnapProfile, string> = {
  cycling: "cycling-regular",
  mtb: "cycling-mountain",
};

/** Distância máxima (m) para "grudar" um toque na via mais próxima. */
const SNAP_RADIUS_M = 1000;
const MAX_POINTS = 50;

function isLatLng(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    Math.abs(v[0]) <= 90 &&
    Math.abs(v[1]) <= 180
  );
}

export async function POST(req: Request) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "not_configured", message: "ORS_API_KEY não configurada" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { profile, coordinates } = (body ?? {}) as {
    profile?: unknown;
    coordinates?: unknown;
  };

  if (
    typeof profile !== "string" ||
    !(ROUTE_SNAP_PROFILES as readonly string[]).includes(profile)
  ) {
    return NextResponse.json({ error: "invalid_profile" }, { status: 400 });
  }
  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    coordinates.length > MAX_POINTS ||
    !coordinates.every(isLatLng)
  ) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  const latLngs = coordinates as [number, number][];

  try {
    const orsRes = await fetch(
      `${ORS_BASE_URL}/${ORS_PROFILE[profile as RouteSnapProfile]}/geojson`,
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
          Accept: "application/geo+json, application/json",
        },
        body: JSON.stringify({
          coordinates: latLngs.map(([lat, lng]) => [lng, lat]),
          radiuses: latLngs.map(() => SNAP_RADIUS_M),
          instructions: false,
        }),
      }
    );

    const text = await orsRes.text();

    if (!orsRes.ok) {
      console.error("OpenRouteService error:", orsRes.status, text);
      return NextResponse.json(
        {
          error: orsRes.status === 429 ? "rate_limited" : "routing_failed",
          status: orsRes.status,
        },
        { status: orsRes.status === 429 ? 429 : 502 }
      );
    }

    const data = JSON.parse(text) as {
      features?: {
        geometry?: { coordinates?: number[][] };
        properties?: { summary?: { distance?: number } };
      }[];
    };
    const feature = data.features?.[0];
    const line = feature?.geometry?.coordinates;
    if (!Array.isArray(line) || line.length < 2) {
      return NextResponse.json({ error: "no_route" }, { status: 502 });
    }

    return NextResponse.json({
      coordinates: line.map(([lng, lat]) => [lat, lng]),
      distanceM: feature?.properties?.summary?.distance ?? null,
    });
  } catch (error) {
    console.error("Route snap API error:", error);
    return NextResponse.json({ error: "routing_failed" }, { status: 502 });
  }
}
