// app/api/bike-services/route.ts

import { NextResponse } from "next/server";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

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

    return NextResponse.json(JSON.parse(text));
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