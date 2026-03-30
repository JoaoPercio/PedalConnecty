import { supabase } from "./supabase";

export const NEARBY_MAX_KM = 30;

export interface RouteGeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface RouteRow {
  id: string;
  name: string;
  description: string | null;
  route_geojson: RouteGeoJSONLineString;
  distance_km: number | null;
  elevation_gain: number | null;
  user_id: string;
  start_lat: number | null;
  start_lng: number | null;
  created_at: string;
}

export interface RouteWithCreator extends RouteRow {
  creator: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  route_ratings: { rating: number }[] | null;
}

export interface RouteCommentRow {
  id: string;
  route_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
}

/**
 * Haversine distance between two WGS84 points in kilometers.
 */
export function haversineDistanceKm(
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

export function averageRatingFromRows(
  ratings: { rating: number }[] | null | undefined
): number | null {
  if (!ratings || ratings.length === 0) return null;
  const sum = ratings.reduce((a, r) => a + r.rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export function displayCreatorName(
  p: { first_name: string | null; last_name: string | null } | null | undefined
): string {
  if (!p) return "Usuário";
  const parts = [p.first_name, p.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Usuário";
}

/** First point of the line (GeoJSON is [lng, lat]) — matches DB start_lat / start_lng. */
export function lineStringToStart(
  geo: RouteGeoJSONLineString
): { start_lat: number; start_lng: number } {
  const coords = geo.coordinates;
  if (!coords.length) return { start_lat: 0, start_lng: 0 };
  const [lng0, lat0] = coords[0];
  return { start_lat: lat0, start_lng: lng0 };
}

/** Prefer stored start; otherwise first coordinate of GeoJSON (for older rows). */
export function routePointForDistance(
  r: Pick<RouteRow, "start_lat" | "start_lng" | "route_geojson">
): { lat: number; lng: number } | null {
  if (r.start_lat != null && r.start_lng != null) {
    return { lat: Number(r.start_lat), lng: Number(r.start_lng) };
  }
  const c = r.route_geojson?.coordinates?.[0];
  if (!c) return null;
  const [lng, lat] = c;
  return { lat, lng };
}

/** Leaflet map value: coordinates as [lat, lng][]. */
export function routeMapValueFromLineString(geo: RouteGeoJSONLineString): {
  geojson: RouteGeoJSONLineString;
  coordinates: [number, number][];
} {
  return {
    geojson: geo,
    coordinates: geo.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}

/**
 * Loads recent shared routes; nearby filtering uses Haversine in `filterNearbyRoutes`
 * (supports nullable start_lat/start_lng via GeoJSON fallback).
 */
export async function fetchRoutesForNearbyList(): Promise<{
  rows: RouteWithCreator[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("routes")
    .select(
      `
      id,
      name,
      description,
      route_geojson,
      distance_km,
      elevation_gain,
      user_id,
      start_lat,
      start_lng,
      created_at,
      profiles!routes_user_id_fkey ( first_name, last_name ),
      route_ratings ( rating )
    `
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return { rows: [], error };
  }

  const raw = (data ?? []) as unknown as {
    profiles: { first_name: string | null; last_name: string | null } | null;
    route_ratings: { rating: number }[] | null;
    [key: string]: unknown;
  }[];

  const rows: RouteWithCreator[] = raw.map((r) => {
    const { profiles, route_ratings, ...rest } = r;
    return {
      ...(rest as unknown as RouteRow),
      creator: profiles,
      route_ratings,
    };
  });

  return { rows, error: null };
}

export function filterNearbyRoutes(
  rows: RouteWithCreator[],
  userLat: number,
  userLng: number,
  maxKm: number
): RouteWithCreator[] {
  return rows.filter((r) => {
    const p = routePointForDistance(r);
    if (!p) return false;
    return haversineDistanceKm(userLat, userLng, p.lat, p.lng) <= maxKm;
  });
}

export async function fetchFavoriteRouteIdsForUser(
  userId: string,
  routeIds: string[]
): Promise<Set<string>> {
  if (routeIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("route_favorites")
    .select("route_id")
    .eq("user_id", userId)
    .in("route_id", routeIds);

  if (error || !data) return new Set();
  return new Set((data as { route_id: string }[]).map((x) => x.route_id));
}

export async function fetchRouteById(
  routeId: string
): Promise<{ route: RouteWithCreator | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("routes")
    .select(
      `
      id,
      name,
      description,
      route_geojson,
      distance_km,
      elevation_gain,
      user_id,
      start_lat,
      start_lng,
      created_at,
      profiles!routes_user_id_fkey ( first_name, last_name ),
      route_ratings ( rating )
    `
    )
    .eq("id", routeId)
    .maybeSingle();

  if (error) return { route: null, error };
  if (!data) return { route: null, error: null };

  const row = data as unknown as {
    profiles: { first_name: string | null; last_name: string | null } | null;
    route_ratings: { rating: number }[] | null;
  } & RouteRow;

  const { profiles, route_ratings, ...rest } = row;
  return {
    route: {
      ...(rest as RouteRow),
      creator: profiles,
      route_ratings,
    },
    error: null,
  };
}

export async function fetchUserRating(
  routeId: string,
  userId: string
): Promise<{ rating: number | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("route_ratings")
    .select("rating")
    .eq("route_id", routeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { rating: null, error };
  const row = data as { rating: number } | null;
  return { rating: row?.rating ?? null, error: null };
}

/**
 * One row per (route_id, user_id). Table uses PK `id` + UNIQUE(route_id, user_id);
 * no `updated_at` column — avoid upsert payloads that PostgREST rejects (400).
 */
export async function upsertRouteRating(
  routeId: string,
  userId: string,
  rating: number
): Promise<{ error: Error | null }> {
  const { data: existing, error: selErr } = await supabase
    .from("route_ratings")
    .select("id")
    .eq("route_id", routeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (selErr) return { error: selErr };

  const row = existing as { id: string } | null;
  if (row?.id) {
    const { error } = await supabase
      .from("route_ratings")
      .update({ rating })
      .eq("id", row.id);
    return { error: error ?? null };
  }

  const { error } = await supabase.from("route_ratings").insert({
    route_id: routeId,
    user_id: userId,
    rating,
  });
  return { error: error ?? null };
}

export async function fetchRouteComments(
  routeId: string
): Promise<{ comments: RouteCommentRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("route_comments")
    .select(
      `
      id,
      route_id,
      user_id,
      comment,
      created_at,
      profiles!route_comments_user_id_fkey ( first_name, last_name )
    `
    )
    .eq("route_id", routeId)
    .order("created_at", { ascending: true });

  if (error) return { comments: [], error };

  const raw = (data ?? []) as unknown as {
    profiles: { first_name: string | null; last_name: string | null } | null;
    [key: string]: unknown;
  }[];

  const comments: RouteCommentRow[] = raw.map((r) => {
    const { profiles, ...rest } = r;
    return {
      ...(rest as Omit<RouteCommentRow, "profiles">),
      profiles,
    };
  });

  return { comments, error: null };
}

export async function insertRouteComment(
  routeId: string,
  userId: string,
  text: string
): Promise<{ error: Error | null }> {
  const trimmed = text.trim();
  if (!trimmed) return { error: new Error("Comentário vazio.") };

  const { error } = await supabase.from("route_comments").insert({
    route_id: routeId,
    user_id: userId,
    comment: trimmed,
  });
  return { error: error ?? null };
}

export async function insertRouteFavorite(
  routeId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("route_favorites").insert({
    route_id: routeId,
    user_id: userId,
  });
  return { error: error ?? null };
}

export async function deleteRouteFavorite(
  routeId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("route_favorites")
    .delete()
    .eq("route_id", routeId)
    .eq("user_id", userId);
  return { error: error ?? null };
}

export async function isRouteFavorited(
  routeId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("route_favorites")
    .select("route_id")
    .eq("route_id", routeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

export interface CreateRouteInput {
  name: string;
  description: string | null;
  route_geojson: RouteGeoJSONLineString;
  distance_km: number | null;
  elevation_gain: number | null;
  user_id: string;
  start_lat: number;
  start_lng: number;
}

export async function createRoute(
  input: CreateRouteInput
): Promise<{ routeId: string | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("routes")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      route_geojson: input.route_geojson,
      distance_km: input.distance_km,
      elevation_gain: input.elevation_gain,
      user_id: input.user_id,
      start_lat: input.start_lat,
      start_lng: input.start_lng,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { routeId: null, error: error ?? new Error("Falha ao criar rota.") };
  }
  return { routeId: (data as { id: string }).id, error: null };
}

export async function fetchFavoriteRoutesForUser(
  userId: string
): Promise<{ routes: RouteWithCreator[]; error: Error | null }> {
  const { data: favRows, error: favError } = await supabase
    .from("route_favorites")
    .select("route_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (favError) return { routes: [], error: favError };

  const routeIds = (favRows ?? []).map((r) => (r as { route_id: string }).route_id);
  if (routeIds.length === 0) return { routes: [], error: null };

  const { data: routeRows, error: routesError } = await supabase
    .from("routes")
    .select(
      `
      id,
      name,
      description,
      route_geojson,
      distance_km,
      elevation_gain,
      user_id,
      start_lat,
      start_lng,
      created_at,
      profiles!routes_user_id_fkey ( first_name, last_name ),
      route_ratings ( rating )
    `
    )
    .in("id", routeIds);

  if (routesError) return { routes: [], error: routesError };

  const raw = (routeRows ?? []) as unknown as {
    profiles: { first_name: string | null; last_name: string | null } | null;
    route_ratings: { rating: number }[] | null;
    [key: string]: unknown;
  }[];

  const byId = new Map<string, RouteWithCreator>();
  for (const r of raw) {
    const { profiles, route_ratings, ...rest } = r;
    byId.set(rest.id as string, {
      ...(rest as unknown as RouteRow),
      creator: profiles,
      route_ratings,
    });
  }

  const routes: RouteWithCreator[] = routeIds
    .map((id) => byId.get(id))
    .filter((x): x is RouteWithCreator => x !== undefined);

  return { routes, error: null };
}
