import { supabase } from "./supabase";

const PEDAL_COVERS_BUCKET = "pedal-covers";
const OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup";

export type PedalDifficulty = "iniciante" | "intermediario" | "avancado";
export type PedalTerrain = "asfalto" | "terra" | "misto" | "trilha";
export type PedalAgeGroup = "todas" | "adultos" | "melhor_idade";
export type PedalVisibility = "public" | "female_only" | "private";

export interface PedalInsert {
  creator_id: string;
  name: string;
  description: string | null;
  date: string;
  start_location: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_location: string | null;
  end_lat: number | null;
  end_lng: number | null;
  distance_km: number | null;
  elevation_gain: number | null;
  difficulty: PedalDifficulty | null;
  terrain: PedalTerrain | null;
  max_participants: number | null;
  requires_safety_equipment: boolean;
  required_equipment: string[];
  age_group: PedalAgeGroup | null;
  visibility: PedalVisibility;
  route_geojson: unknown;
  /** JSON: [{ name, lat, lng }] */
  route_waypoints: unknown;
  cover_image_url: string | null;
  status: string;
}

export interface CreatePedalInput extends Omit<PedalInsert, "creator_id" | "status"> {
  creator_id: string;
}

/**
 * Upload cover image to Supabase Storage and return public URL.
 */
export async function uploadPedalCover(
  pedalId: string,
  file: File
): Promise<{ coverImageUrl: string | null; error: Error | null }> {
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${pedalId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PEDAL_COVERS_BUCKET)
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) return { coverImageUrl: null, error: uploadError };

  const { data } = supabase.storage.from(PEDAL_COVERS_BUCKET).getPublicUrl(filePath);
  return { coverImageUrl: data.publicUrl, error: null };
}

/**
 * Fetch elevations for coordinates via OpenElevation API and return total gain in meters.
 * Samples points if there are too many (API-friendly).
 */
export async function getElevationGain(
  coordinates: [number, number][]
): Promise<{ elevationGainM: number; error: Error | null }> {
  if (coordinates.length < 2) {
    return { elevationGainM: 0, error: null };
  }

  const maxPoints = 100;
  let points = coordinates;
  if (coordinates.length > maxPoints) {
    const step = coordinates.length / maxPoints;
    points = [];
    for (let i = 0; i < maxPoints; i++) {
      const idx = Math.min(Math.floor(i * step), coordinates.length - 1);
      points.push(coordinates[idx]);
    }
    points.push(coordinates[coordinates.length - 1]);
  }

  const locations = points.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

  try {
    const res = await fetch(OPEN_ELEVATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ locations }),
    });

    if (!res.ok) {
      return { elevationGainM: 0, error: new Error(`OpenElevation: ${res.status}`) };
    }

    const data = (await res.json()) as { results?: { elevation: number }[] };
    const elevations = data.results?.map((r) => r.elevation) ?? [];

    let gain = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) gain += diff;
    }

    return { elevationGainM: Math.round(gain * 10) / 10, error: null };
  } catch (err) {
    return {
      elevationGainM: 0,
      error: err instanceof Error ? err : new Error("Elevation request failed"),
    };
  }
}

/**
 * Insert pedal and add creator as approved participant.
 */
export async function createPedal(
  input: CreatePedalInput
): Promise<{ pedalId: string | null; error: Error | null }> {
  const row: PedalInsert = {
    ...input,
    status: "scheduled",
  };

  const { data: pedal, error: insertError } = await supabase
    .from("pedals")
    .insert(row)
    .select("id")
    .single();

  if (insertError || !pedal) {
    return { pedalId: null, error: insertError ?? new Error("Insert failed") };
  }

  const { error: participantError } = await supabase.from("pedal_participants").insert({
    pedal_id: pedal.id,
    user_id: input.creator_id,
    status: "approved",
  });

  if (participantError) {
    return { pedalId: pedal.id, error: participantError };
  }

  return { pedalId: pedal.id, error: null };
}

/**
 * Update pedal's cover_image_url after upload.
 */
export async function updatePedalCoverUrl(
  pedalId: string,
  coverImageUrl: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("pedals")
    .update({ cover_image_url: coverImageUrl })
    .eq("id", pedalId);
  return { error: error ?? null };
}

/** Fields allowed on update (no creator_id / status). */
export type PedalUpdateFields = Omit<PedalInsert, "creator_id" | "status">;

export async function updatePedal(
  pedalId: string,
  fields: PedalUpdateFields
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("pedals").update(fields).eq("id", pedalId);
  return { error: error ?? null };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `datetime-local` string (minute precision) for a Date in the local timezone. */
export function dateToDatetimeLocalValue(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Start of today 00:00 in local time — use as `min` on pedal date inputs. */
export function getMinDatetimeLocalForPedal(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return dateToDatetimeLocalValue(d);
}

/**
 * Validates `datetime-local` value for scheduling a pedal:
 * not before today (calendar), and not in the past when the day is today.
 */
export function validatePedalDatetimeLocal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const picked = new Date(trimmed);
  if (Number.isNaN(picked.getTime())) {
    return "Data e hora inválidas.";
  }
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (picked < startOfToday) {
    return "A data do pedal não pode ser anterior a hoje.";
  }
  if (picked.getTime() < Date.now()) {
    return "Para a data de hoje, escolha um horário que ainda não passou.";
  }
  return null;
}

/** Format ISO date for datetime-local input (local timezone). */
export function toDatetimeLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return dateToDatetimeLocalValue(d);
}

/**
 * Calculate total distance in km from a list of [lat, lng] coordinates (Haversine).
 */
export function calculateDistanceKm(coordinates: [number, number][]): number {
  if (coordinates.length < 2) return 0;
  const R = 6371; // Earth radius in km
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lat1, lng1] = coordinates[i - 1];
    const [lat2, lng2] = coordinates[i];
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return Math.round(total * 100) / 100;
}
