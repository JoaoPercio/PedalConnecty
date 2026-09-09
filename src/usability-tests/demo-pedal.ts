import type { EnrichedNearbyPedal } from "@/lib/pedal-filters";
import type {
  PedalDetailRecord,
  PedalParticipantRow,
} from "@/types/pedal-details";
import { getUsabilityCurrentTestNumber } from "./demo-notification";

export const DEMO_PEDAL_ID = "00000000-0000-4000-a000-000000000004";

/** Sentinel only — never a real account and never written to Supabase. */
const DEMO_CREATOR_ID = "00000000-0000-4000-a000-00000000cfea";

const SNAPSHOT_KEY = "usability-demo-pedal-snapshot";
const JOIN_KEY_PREFIX = "usability-demo-pedal-join:";

const DEMO_OFFSET_NORTH_M = 300;
const DEMO_OFFSET_EAST_M = 200;

interface DemoPedalSnapshot {
  lat: number;
  lng: number;
  date: string;
}

export function isDemoPedalId(id: string): boolean {
  return id === DEMO_PEDAL_ID;
}

export function shouldInjectDemoPedal(): boolean {
  return getUsabilityCurrentTestNumber() === 4;
}

function roundDistanceKm(km: number): number {
  return Math.round(km * 10) / 10;
}

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function offsetMeters(
  lat: number,
  lng: number,
  northMeters: number,
  eastMeters: number
): { lat: number; lng: number } {
  const dLat = northMeters / 111_320;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const metersPerDegLng = 111_320 * Math.max(0.2, Math.abs(cosLat));
  const dLng = eastMeters / metersPerDegLng;
  return { lat: lat + dLat, lng: lng + dLng };
}

function demoPedalDateIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

function readSnapshot(): DemoPedalSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoPedalSnapshot;
    if (
      typeof parsed?.lat !== "number" ||
      typeof parsed?.lng !== "number" ||
      typeof parsed?.date !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: DemoPedalSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}

function getOrCreateSnapshot(
  userLat: number,
  userLng: number
): DemoPedalSnapshot {
  const existing = readSnapshot();
  if (existing && new Date(existing.date).getTime() > Date.now()) {
    return existing;
  }
  const { lat, lng } = offsetMeters(
    userLat,
    userLng,
    DEMO_OFFSET_NORTH_M,
    DEMO_OFFSET_EAST_M
  );
  const snapshot: DemoPedalSnapshot = {
    lat,
    lng,
    date: demoPedalDateIso(),
  };
  writeSnapshot(snapshot);
  return snapshot;
}

function snapshotOrFallback(): DemoPedalSnapshot {
  const existing = readSnapshot();
  if (existing) return existing;
  return {
    lat: -23.5505,
    lng: -46.6333,
    date: demoPedalDateIso(),
  };
}

/** In-memory / sessionStorage only — never persisted to Supabase. */
export function buildDemoNearbyPedal(
  userLat: number,
  userLng: number
): EnrichedNearbyPedal {
  const snap = getOrCreateSnapshot(userLat, userLng);
  return {
    id: DEMO_PEDAL_ID,
    name: "Pedal de demonstração",
    date: snap.date,
    distance_km: 12,
    difficulty: "iniciante",
    terrain: "asfalto",
    age_group: "todas",
    visibility: "public",
    max_participants: 12,
    cover_image_url: null,
    start_lat: snap.lat,
    start_lng: snap.lng,
    computedDistanceKm: roundDistanceKm(
      distanceKm(userLat, userLng, snap.lat, snap.lng)
    ),
    approved_count: 1,
  };
}

/** In-memory / sessionStorage only — never persisted to Supabase. */
export function getDemoPedalDetail(): PedalDetailRecord {
  const snap = snapshotOrFallback();
  return {
    id: DEMO_PEDAL_ID,
    creator_id: DEMO_CREATOR_ID,
    name: "Pedal de demonstração",
    description:
      "Este é um pedal de demonstração do PedalConnect. Solicite participação para concluir o Teste 4 de usabilidade. Nada é gravado no servidor.",
    date: snap.date,
    status: "scheduled",
    started_at: null,
    ended_at: null,
    distance_km: 12,
    average_speed_kmh: 18,
    elevation_gain: 80,
    difficulty: "iniciante",
    terrain: "asfalto",
    max_participants: 12,
    requires_safety_equipment: true,
    required_equipment: ["Capacete"],
    age_group: "todas",
    visibility: "public",
    start_location: "Ponto de encontro de demonstração",
    start_lat: snap.lat,
    start_lng: snap.lng,
    route_geojson: null,
  };
}

export function ensureDemoPedalInList(
  userLat: number,
  userLng: number,
  rows: EnrichedNearbyPedal[]
): EnrichedNearbyPedal[] {
  if (!shouldInjectDemoPedal()) return rows;
  if (rows.some((r) => r.id === DEMO_PEDAL_ID)) return rows;
  return [buildDemoNearbyPedal(userLat, userLng), ...rows];
}

export function getDemoPedalParticipation(
  userId: string
): PedalParticipantRow | null {
  if (typeof window === "undefined") return null;
  try {
    if (sessionStorage.getItem(`${JOIN_KEY_PREFIX}${userId}`) !== "pending") {
      return null;
    }
  } catch {
    return null;
  }
  return {
    id: "usability-demo-participation",
    pedal_id: DEMO_PEDAL_ID,
    user_id: userId,
    status: "pending",
  };
}

export function setDemoPedalJoinRequested(userId: string): PedalParticipantRow {
  try {
    sessionStorage.setItem(`${JOIN_KEY_PREFIX}${userId}`, "pending");
  } catch {
    /* ignore */
  }
  return {
    id: "usability-demo-participation",
    pedal_id: DEMO_PEDAL_ID,
    user_id: userId,
    status: "pending",
  };
}

export function clearDemoPedalJoin(userId: string): void {
  try {
    sessionStorage.removeItem(`${JOIN_KEY_PREFIX}${userId}`);
  } catch {
    /* ignore */
  }
}
