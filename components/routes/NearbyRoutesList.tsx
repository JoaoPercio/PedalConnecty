"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  NEARBY_MAX_KM,
  fetchFavoriteRouteIdsForUser,
  fetchFavoriteRoutesForUser,
  fetchRoutesForNearbyList,
  filterNearbyRoutes,
  type RouteWithCreator,
} from "@/lib/routes";
import {
  requestUserPosition,
  LOCATION_PERMISSION_MESSAGE,
} from "@/lib/geolocation";
import { RouteCard } from "./RouteCard";

const PAGE_SIZE = 6;

type RoutesTab = "todas" | "favoritas";

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 8 12 8 12s8-6.6 8-12c0-4.4-3.6-8-8-8Zm0 10.8A2.8 2.8 0 1 1 12 7.2a2.8 2.8 0 0 1 0 5.6Z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 21s-6.716-4.05-8.95-8.2C1.55 10.37 3.5 6.5 8 6.5c2.5 0 4 2 4 2s1.5-2 4-2c4.5 0 6.45 3.87 4.95 6.3C18.716 16.95 12 21 12 21Z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-2.1-5.7" />
      <path d="M21 4v6h-6" />
    </svg>
  );
}

function FilterTabs({
  tab,
  onChange,
  fullWidth,
}: {
  tab: RoutesTab;
  onChange: (next: RoutesTab) => void;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`flex rounded-full bg-gray-100 p-1 ${fullWidth ? "w-full" : "w-auto"}`}
      role="tablist"
      aria-label="Filtrar rotas"
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === "todas"}
        onClick={() => onChange("todas")}
        className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          fullWidth ? "flex-1" : ""
        } ${
          tab === "todas"
            ? "bg-white text-primary shadow-sm"
            : "text-text-secondary hover:text-foreground"
        }`}
      >
        Todas
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "favoritas"}
        onClick={() => onChange("favoritas")}
        className={`inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          fullWidth ? "flex-1" : ""
        } ${
          tab === "favoritas"
            ? "bg-white text-primary shadow-sm"
            : "text-text-secondary hover:text-foreground"
        }`}
      >
        <HeartIcon className="h-4 w-4" />
        Favoritas
      </button>
    </div>
  );
}

function CreateRouteButton() {
  return (
    <>
      <Link
        href="/routes/create"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/30 md:hidden"
        aria-label="Criar rota"
      >
        <PlusIcon className="h-5 w-5" />
      </Link>
      <Link
        href="/routes/create"
        className="hidden items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/30 md:inline-flex"
      >
        <PlusIcon className="h-4 w-4" />
        Criar rota
      </Link>
    </>
  );
}

export function NearbyRoutesList() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: RoutesTab =
    searchParams.get("tab") === "favoritas" ? "favoritas" : "todas";

  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteWithCreator[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [favoriteRoutes, setFavoriteRoutes] = useState<RouteWithCreator[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  const setTab = useCallback(
    (next: RoutesTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "favoritas") params.set("tab", "favoritas");
      else params.delete("tab");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let lat: number;
    let lng: number;
    try {
      [lat, lng] = await requestUserPosition();
    } catch {
      setError(LOCATION_PERMISSION_MESSAGE);
      setRoutes([]);
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab]);

  useEffect(() => {
    if (tab !== "favoritas" || !user || favoritesLoaded) return;

    let cancelled = false;
    setFavoritesLoading(true);
    setFavoritesError(null);

    void fetchFavoriteRoutesForUser(user.id).then(({ routes: rows, error: err }) => {
      if (cancelled) return;
      if (err) {
        setFavoritesError(err.message);
        setFavoriteRoutes([]);
      } else {
        setFavoriteRoutes(rows);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          for (const r of rows) next.add(r.id);
          return next;
        });
      }
      setFavoritesLoaded(true);
      setFavoritesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tab, user, favoritesLoaded]);

  const handleFavoriteChange = useCallback(
    (routeId: string, favorited: boolean) => {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (favorited) next.add(routeId);
        else next.delete(routeId);
        return next;
      });

      if (!favorited) {
        setFavoriteRoutes((prev) => prev.filter((r) => r.id !== routeId));
        return;
      }

      const found = routes.find((r) => r.id === routeId);
      if (found) {
        setFavoriteRoutes((prev) => [
          found,
          ...prev.filter((r) => r.id !== routeId),
        ]);
      }
    },
    [routes]
  );

  const sourceList = tab === "favoritas" ? favoriteRoutes : routes;
  const visibleRoutes = useMemo(
    () => sourceList.slice(0, visibleCount),
    [sourceList, visibleCount]
  );
  const hasMore = visibleCount < sourceList.length;

  const listLoading = tab === "favoritas" ? favoritesLoading && !favoritesLoaded : loading;
  const listError = tab === "favoritas" ? favoritesError : error;

  return (
    <div>
      <header className="mb-6">
        <div className="hidden items-center gap-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-primary">
              <PinIcon className="h-7 w-7 shrink-0" />
              Rotas perto
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Encontre as melhores rotas de bicicleta perto de você.
            </p>
          </div>
          <FilterTabs tab={tab} onChange={setTab} />
          <div className="flex justify-end">
            <CreateRouteButton />
          </div>
        </div>

        <div className="md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-bold text-primary">
                <PinIcon className="h-6 w-6 shrink-0" />
                Rotas perto
              </h1>
            </div>
            <CreateRouteButton />
          </div>
          <div className="mt-4">
            <FilterTabs tab={tab} onChange={setTab} fullWidth />
          </div>
        </div>
      </header>

      {listLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-surface/60">
          <p className="text-sm text-text-secondary">
            {tab === "favoritas"
              ? "Carregando favoritos…"
              : "Carregando rotas próximas…"}
          </p>
        </div>
      ) : listError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800">
          {listError}
        </div>
      ) : sourceList.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-surface px-4 py-10 text-center shadow-sm">
          {tab === "favoritas" ? (
            <>
              <p className="text-foreground">Você ainda não salvou rotas favoritas.</p>
              <button
                type="button"
                onClick={() => setTab("todas")}
                className="mt-4 inline-block rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] px-5 py-2.5 text-sm font-semibold text-white shadow-md"
              >
                Explorar rotas
              </button>
            </>
          ) : (
            <>
              <p className="text-foreground">
                Nenhuma rota compartilhada num raio de {NEARBY_MAX_KM} km
                {userPos ? <> da sua posição atual</> : null}.
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
            </>
          )}
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRoutes.map((r) => (
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
          {hasMore ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <RefreshIcon className="h-4 w-4" />
                Carregar mais rotas
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
