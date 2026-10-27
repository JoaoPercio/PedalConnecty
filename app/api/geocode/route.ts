// app/api/geocode/route.ts

import { NextResponse } from "next/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
  road?: string;
  state?: string;
  "ISO3166-2-lvl4"?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

/** "Bairro, Cidade, UF" curto em vez do display_name enorme do Nominatim. */
function shortLabel(r: NominatimResult): string {
  const a = r.address;
  if (!a) return r.display_name;
  const city = a.city ?? a.town ?? a.village ?? a.municipality;
  const uf = a["ISO3166-2-lvl4"]?.replace(/^BR-/, "") ?? a.state;
  const parts = [a.road ?? a.suburb, city, uf].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : r.display_name;
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

  if (q.length < 2 || q.length > 200) {
    return NextResponse.json({ error: "Busca inválida" }, { status: 400 });
  }

  try {
    const url = new URL(NOMINATIM_URL);
    url.search = new URLSearchParams({
      q,
      format: "json",
      addressdetails: "1",
      countrycodes: "br",
      limit: "6",
      "accept-language": "pt-BR",
    }).toString();

    const res = await fetch(url, {
      headers: {
        "User-Agent": "PedalConnect/1.0 (contact: jp.percito@gmail.com)",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      console.error("Nominatim error:", res.status);
      return NextResponse.json(
        { error: "Erro ao buscar localização" },
        { status: 502 }
      );
    }

    const data = (await res.json()) as NominatimResult[];
    const results = data.map((r) => ({
      label: shortLabel(r),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Geocode API error:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar localização" },
      { status: 500 }
    );
  }
}
