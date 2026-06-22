import { supabase } from "@/lib/supabase";
import type {
  PedalAgeGroup,
  PedalDifficulty,
  PedalTerrain,
  PedalVisibility,
} from "@/lib/pedals";
import {
  DEFAULT_PEDAL_FILTERS,
  DISTANCE_OPTIONS_KM,
  type EnrichedNearbyPedal,
} from "@/lib/pedal-filters";
import { haversineDistanceKm } from "@/lib/routes";

/** Maior raio dos filtros de distância — busca no servidor cobre todo o range do filtro. */
export const MAX_NEARBY_PEDALS_RADIUS_KM = Math.max(...DISTANCE_OPTIONS_KM);

export interface NearbyPedalRow {
  id: string;
  name: string;
  description: string | null;
  date: string;
  start_lat: number;
  start_lng: number;
  distance_km: number | null;
  elevation_gain: number | null;
  difficulty: PedalDifficulty | null;
  terrain: PedalTerrain | null;
  max_participants: number | null;
  age_group: PedalAgeGroup | null;
  visibility: PedalVisibility;
  status: string;
}

function roundDistanceKm(km: number): number {
  return Math.round(km * 10) / 10;
}

async function fetchApprovedCounts(
  pedalIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (pedalIds.length === 0) return map;
  const { data, error } = await supabase
    .from("pedal_participants")
    .select("pedal_id")
    .in("pedal_id", pedalIds)
    .eq("status", "approved");
  if (error || !data) return map;
  for (const row of data as { pedal_id: string }[]) {
    map.set(row.pedal_id, (map.get(row.pedal_id) ?? 0) + 1);
  }
  return map;
}

export async function fetchNearbyPedals(
  lat: number,
  lng: number,
  radiusKm = DEFAULT_PEDAL_FILTERS.maxDistanceKm
): Promise<{ data: NearbyPedalRow[]; error: Error | null }> {
  const { data, error } = await supabase.rpc("nearby_pedals", {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
  });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows = ((data as NearbyPedalRow[] | null) ?? []).filter(
    (p): p is NearbyPedalRow =>
      p.start_lat != null && p.start_lng != null
  );

  return { data: rows, error: null };
}

export async function loadNearbyPedalsForView(
  lat: number,
  lng: number,
  radiusKm = MAX_NEARBY_PEDALS_RADIUS_KM
): Promise<{ data: EnrichedNearbyPedal[]; error: Error | null }> {
  const { data: rows, error } = await fetchNearbyPedals(lat, lng, radiusKm);
  if (error) {
    return { data: [], error };
  }

  const ids = rows.map((r) => r.id);
  const counts = await fetchApprovedCounts(ids);

  const enriched: EnrichedNearbyPedal[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    date: p.date,
    distance_km: p.distance_km,
    difficulty: p.difficulty,
    terrain: p.terrain,
    age_group: p.age_group,
    visibility: p.visibility,
    max_participants: p.max_participants,
    start_lat: Number(p.start_lat),
    start_lng: Number(p.start_lng),
    computedDistanceKm: roundDistanceKm(
      haversineDistanceKm(lat, lng, Number(p.start_lat), Number(p.start_lng))
    ),
    approved_count: counts.get(p.id) ?? 0,
  }));

  return { data: enriched, error: null };
}
