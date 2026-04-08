import { supabase } from "@/lib/supabase";

export type MapAlertType =
  | "danger"
  | "obstacle"
  | "good_route"
  | "climb"
  | "repair"
  | "water";

export interface MapAlertRow {
  id: string;
  user_id: string;
  type: MapAlertType;
  description: string | null;
  lat: number;
  lng: number;
  expires_at: string;
  created_at: string | null;
}

export interface MapAlertProfileSnippet {
  id: string;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface MapAlertWithProfile extends MapAlertRow {
  profile: MapAlertProfileSnippet | null;
}

export const MAP_ALERT_TYPE_OPTIONS: {
  value: MapAlertType;
  label: string;
  emoji: string;
}[] = [
  { value: "danger", label: "Perigo", emoji: "⚠️" },
  { value: "obstacle", label: "Obstáculo", emoji: "🚧" },
  { value: "good_route", label: "Rota boa", emoji: "🚴" },
  { value: "climb", label: "Subida difícil", emoji: "⛰️" },
  { value: "repair", label: "Oficina", emoji: "🛠️" },
  { value: "water", label: "Ponto de água", emoji: "💧" },
];

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

export function expiresAtForAlertType(type: MapAlertType, from: Date = new Date()): Date {
  switch (type) {
    case "danger":
      return new Date(from.getTime() + 6 * MS_HOUR);
    case "obstacle":
      return new Date(from.getTime() + 12 * MS_HOUR);
    case "good_route":
      return new Date(from.getTime() + 30 * MS_DAY);
    case "climb":
    case "repair":
    case "water":
      return new Date(from.getTime() + 30 * MS_DAY);
  }
}

export function mapAlertTypeMeta(type: MapAlertType): { label: string; emoji: string } {
  const found = MAP_ALERT_TYPE_OPTIONS.find((o) => o.value === type);
  return found ?? { label: type, emoji: "📍" };
}

export function formatTimeRemaining(expiresAtIso: string): string {
  const end = new Date(expiresAtIso).getTime();
  const now = Date.now();
  const ms = end - now;
  if (ms <= 0) return "Expirado";

  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) {
    return minutes <= 1 ? "Expira em ~1 min" : `Expira em ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return hours === 1 ? "Expira em 1h" : `Expira em ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? "Expira em 1 dia" : `Expira em ${days} dias`;
}

export const MAP_ALERT_DESCRIPTION_MAX = 200;

export const MAP_ALERT_CREATE_COOLDOWN_MS = 30_000;

export async function deleteExpiredMapAlerts(): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("delete_expired_alerts");
  return { error: error ? new Error(error.message) : null };
}

export async function fetchNearbyMapAlerts(
  lat: number,
  lng: number,
  radiusKm = 30
): Promise<{ data: MapAlertRow[]; error: Error | null }> {
  const { data, error } = await supabase.rpc("nearby_map_alerts", {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
  });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows = (data as MapAlertRow[] | null) ?? [];
  return { data: rows, error: null };
}

async function attachProfiles(rows: MapAlertRow[]): Promise<MapAlertWithProfile[]> {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  if (ids.length === 0) {
    return rows.map((r) => ({ ...r, profile: null }));
  }

  const { data: profs, error } = await supabase
    .from("profiles")
    .select("id, avatar_url, first_name, last_name")
    .in("id", ids);

  if (error || !profs) {
    return rows.map((r) => ({ ...r, profile: null }));
  }

  const byId = new Map(
    (profs as MapAlertProfileSnippet[]).map((p) => [p.id, p] as const)
  );

  return rows.map((r) => ({
    ...r,
    profile: byId.get(r.user_id) ?? null,
  }));
}

export async function loadMapAlertsForView(
  lat: number,
  lng: number,
  radiusKm = 30
): Promise<{ data: MapAlertWithProfile[]; error: Error | null }> {
  const del = await deleteExpiredMapAlerts();
  if (del.error) {
    return { data: [], error: del.error };
  }

  const { data: rows, error } = await fetchNearbyMapAlerts(lat, lng, radiusKm);
  if (error) {
    return { data: [], error };
  }

  const enriched = await attachProfiles(rows);
  return { data: enriched, error: null };
}

export async function insertMapAlert(params: {
  userId: string;
  type: MapAlertType;
  description: string | null;
  lat: number;
  lng: number;
}): Promise<{ error: Error | null }> {
  const expiresAt = expiresAtForAlertType(params.type);
  const { error } = await supabase.from("map_alerts").insert({
    user_id: params.userId,
    type: params.type,
    description: params.description,
    lat: params.lat,
    lng: params.lng,
    expires_at: expiresAt.toISOString(),
  });

  return { error: error ? new Error(error.message) : null };
}

export async function deleteMapAlert(alertId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("map_alerts").delete().eq("id", alertId);
  return { error: error ? new Error(error.message) : null };
}
