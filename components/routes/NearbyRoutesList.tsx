"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  NEARBY_MAX_KM,
  fetchFavoriteRouteIdsForUser,
  fetchRoutesForNearbyList,
  filterNearbyRoutes,
  type RouteWithCreator,
} from "@/lib/routes";
import { requestUserPosition } from "@/lib/geolocation";
import { RouteCard } from "./RouteCard";

export function NearbyRoutesList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteWithCreator[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [lat, lng] = await requestUserPosition();
    setUserPos([lat, lng]);
    const { rows, error: fetchErr } = await fetchRoutesForNearbyList();
    if (fetchErr) {
      setError(fetchErr.message);
      setRoutes([]);
      setLoading(false);
      return;
    }
    const nearby = filterNearbyRoutes(rows, lat, lng, NEARBY_MAX_KM);
    setRoutes(nearby);

    if (user && nearby.length > 0) {
      const ids = await fetchFavoriteRouteIdsForUser(
        user.id,
        nearby.map((r) => r.id)
      );
      setFavoriteIds(ids);
    } else {
      setFavoriteIds(new Set());
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFavoriteChange = useCallback((routeId: string, favorited: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (favorited) next.add(routeId);
      else next.delete(routeId);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-surface/60">
        <p className="text-sm text-text-secondary">Carregando rotas próximas…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-surface px-4 py-10 text-center shadow-sm">
        <p className="text-foreground">
          Nenhuma rota compartilhada num raio de {NEARBY_MAX_KM} km
          {userPos ? (
            <>
              {" "}
              da sua posição atual
            </>
          ) : null}
          .
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Crie uma rota ou volte mais tarde.
        </p>
        <Link
          href="/routes/create"
          className="mt-4 inline-block rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] px-5 py-2.5 text-sm font-semibold text-white shadow-md"
        >
          Criar rota
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {routes.map((r) => (
        <li key={r.id}>
          <RouteCard
            route={r}
            favorited={favoriteIds.has(r.id)}
            onFavoriteChange={handleFavoriteChange}
            showRoutePreview
          />
        </li>
      ))}
    </ul>
  );
}
