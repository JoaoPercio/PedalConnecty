"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  displayCreatorName,
  fetchRouteById,
  fetchUserRating,
  isRouteFavorited,
  routeMapValueFromLineString,
  averageRatingFromRows,
  type RouteWithCreator,
} from "@/lib/routes";
import { RouteFavoriteButton } from "./RouteFavoriteButton";
import { RouteRating } from "./RouteRating";
import { RouteComments } from "./RouteComments";

const RouteMap = dynamic(() => import("./RouteMap").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-text-secondary">
      Carregando mapa…
    </div>
  ),
});

interface RouteDetailViewProps {
  routeId: string;
}

export function RouteDetailView({ routeId }: RouteDetailViewProps) {
  const { user } = useAuth();
  const [route, setRoute] = useState<RouteWithCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [favorited, setFavorited] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);
    const { route: r, error: rErr } = await fetchRouteById(routeId);
    if (rErr || !r) {
      setError(rErr?.message ?? "Rota não encontrada.");
      setRoute(null);
      if (!silent) setLoading(false);
      return;
    }
    setRoute(r);

    if (user) {
      const [{ rating }, fav] = await Promise.all([
        fetchUserRating(routeId, user.id),
        isRouteFavorited(routeId, user.id),
      ]);
      setUserRating(rating);
      setFavorited(fav);
    } else {
      setUserRating(null);
      setFavorited(false);
    }
    if (!silent) setLoading(false);
  }, [routeId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRated = useCallback(() => {
    void load({ silent: true });
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-text-secondary">Carregando rota…</p>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800">
        {error ?? "Rota não encontrada."}
      </div>
    );
  }

  const mapValue = routeMapValueFromLineString(
    route.route_geojson,
    route.route_waypoints
  );
  const avg = averageRatingFromRows(route.route_ratings);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/routes"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Rotas perto
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{route.name}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Por {displayCreatorName(route.creator)}
          </p>
        </div>
        <RouteFavoriteButton
          routeId={route.id}
          initialFavorited={favorited}
          size="lg"
          onChange={setFavorited}
        />
      </div>

      {route.description ? (
        <p className="whitespace-pre-wrap text-base text-foreground">{route.description}</p>
      ) : null}

      <dl className="flex flex-wrap gap-4 text-sm text-text-secondary">
        <div>
          <dt className="font-medium text-foreground">Distância</dt>
          <dd>
            {route.distance_km != null
              ? `${Number(route.distance_km).toFixed(1)} km`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Elevação</dt>
          <dd>
            {route.elevation_gain != null
              ? `${Number(route.elevation_gain).toFixed(0)} m`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Média</dt>
          <dd>{avg != null ? `${avg.toFixed(1)} ★` : "—"}</dd>
        </div>
      </dl>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Mapa</h2>
        <RouteMap
          value={mapValue}
          onChange={() => {}}
          readOnly
          height="280px"
        />
        {mapValue.waypoints.length > 0 ? (
          <div className="mt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Paradas
            </h3>
            <ol className="mt-1.5 list-inside list-decimal space-y-1 text-sm text-foreground">
              {mapValue.waypoints.map((w) => (
                <li key={w.id}>{w.name.trim() || "Parada"}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <RouteRating
        route={route}
        userRating={userRating}
        onUpdated={handleRated}
      />

      <RouteComments routeId={route.id} />
    </div>
  );
}
