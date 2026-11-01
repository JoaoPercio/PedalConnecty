// app/api/bike-services/route.ts

import { NextResponse } from "next/server";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

/** Cache em memória por consulta: usuários na mesma região evitam nova ida ao Overpass. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const cache = new Map<string, { data: unknown; expiresAt: number }>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body.query;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query inválida" },
        { status: 400 }
      );
    }

    const cached = cache.get(query);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const overpassRes = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "PedalConnect/1.0 (contact: jp.percito@gmail.com)",
      },
      body: new URLSearchParams({
        data: query,
      }).toString(),
    });

    const text = await overpassRes.text();

    if (!overpassRes.ok) {
      console.error("Overpass error:", overpassRes.status, text);

      return NextResponse.json(
        {
          error: "Erro ao consultar Overpass",
          status: overpassRes.status,
          details: text,
        },
        { status: overpassRes.status }
      );
    }

    const data = JSON.parse(text);
    if (cache.size >= CACHE_MAX_ENTRIES) {
      // Map mantém ordem de inserção: remove a entrada mais antiga.
      cache.delete(cache.keys().next().value!);
    }
    cache.set(query, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Bike services API error:", error);

    return NextResponse.json(
      {
        error: "Erro interno ao buscar serviços de bike",
      },
      { status: 500 }
    );
  }
}