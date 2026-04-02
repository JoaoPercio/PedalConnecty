"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";
import type { PedalDifficulty, PedalTerrain } from "@/lib/pedals";
import type { PedalVisibility } from "@/lib/pedals";
import type { PedalAgeGroup } from "@/lib/pedals";
import {
  requestUserPosition,
  LOCATION_PERMISSION_MESSAGE,
} from "@/lib/geolocation";
import type { NearbyPedal } from "./PedalMarker";
import { FilterModal } from "@/components/filters/FilterModal";
import { PedalFilters } from "@/components/filters/PedalFilters";
import {
  applyPedalFilters,
  countActiveFilters,
  DEFAULT_PEDAL_FILTERS,
  describeActiveFilters,
  type EnrichedNearbyPedal,
  type PedalFiltersState,
} from "@/lib/pedal-filters";

interface PedalRow {
  id: string;
  name: string;
  description: string | null;
  date: string;
  start_lat: number | null;
  start_lng: number | null;
  distance_km: number | null;
  elevation_gain: number | null;
  difficulty: PedalDifficulty | null;
  terrain: PedalTerrain | null;
  max_participants: number | null;
  age_group: PedalAgeGroup | null;
  visibility: PedalVisibility;
  status: string;
}

/** Limite de linhas no Supabase (evita carregar tudo). */
const FETCH_LIMIT = 800;

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
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

function createPedalPinIcon(L: typeof import("leaflet")): L.DivIcon {
  const html = `
    <div class="pedal-pin-wrap">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 56" width="44" height="56" aria-hidden="true">
        <path fill="#1B5E20" stroke="#ffffff" stroke-width="1.5"
          d="M22 3C12.8 3 5 10.5 5 19.2c0 7.8 6.5 16.5 17 33.8 10.5-17.3 17-26 17-33.8C39 10.5 31.2 3 22 3z"
          style="filter:drop-shadow(0 2px 4px rgba(27,94,32,0.35))"/>
        <path fill="#43A047" opacity="0.9"
          d="M22 6c-7.2 0-13 5.6-13 12.5 0 4.2 2.8 9.2 8.5 18.5 5.7-9.3 8.5-14.3 8.5-18.5C35 11.6 29.2 6 22 6z"/>
        <circle cx="22" cy="18.5" r="10" fill="#ffffff"/>
        <text x="22" y="23" text-anchor="middle" fill="#1B5E20" font-size="15" font-weight="700" font-family="system-ui,sans-serif">P</text>
      </svg>
    </div>`;

  return L.divIcon({
    className: "pedal-nearby-marker",
    html,
    iconSize: [44, 56],
    iconAnchor: [22, 56],
    popupAnchor: [0, -52],
  });
}

function formatPedalWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function toNearbyPedal(p: EnrichedNearbyPedal): NearbyPedal {
  return {
    id: p.id,
    name: p.name,
    date: p.date,
    distance_km: p.distance_km ?? p.computedDistanceKm,
    difficulty: p.difficulty,
    start_lat: p.start_lat,
    start_lng: p.start_lng,
  };
}

const NearbyMapInner = () => {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingPedals, setLoadingPedals] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<EnrichedNearbyPedal[]>([]);
  const [filters, setFilters] = useState<PedalFiltersState>(DEFAULT_PEDAL_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoadingLocation(true);
    requestUserPosition()
      .then((pos) => {
        if (!isMounted) return;
        setUserLocation(pos);
      })
      .catch(() => {
        if (!isMounted) return;
        setError(LOCATION_PERMISSION_MESSAGE);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoadingLocation(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    let isMounted = true;
    const fetchPedals = async () => {
      setLoadingPedals(true);
      setError(null);
      const { data, error: supaError } = await supabase
        .from("pedals")
        .select(
          "id,name,description,date,start_lat,start_lng,distance_km,elevation_gain,difficulty,terrain,status,visibility,max_participants,age_group"
        )
        .or("status.eq.scheduled,status.eq.in_progress")
        .in("visibility", ["public", "female_only"])
        .not("start_lat", "is", null)
        .not("start_lng", "is", null)
        .order("date", { ascending: true })
        .limit(FETCH_LIMIT);

      if (!isMounted) return;

      if (supaError) {
        setError("Erro ao carregar pedais próximos.");
        setLoadingPedals(false);
        return;
      }

      const rows = (data as PedalRow[] | null) ?? [];
      const [userLat, userLng] = userLocation;
      const ids = rows.map((r) => r.id);
      const counts = await fetchApprovedCounts(ids);

      const enriched: EnrichedNearbyPedal[] = rows
        .filter(
          (p): p is PedalRow & { start_lat: number; start_lng: number } =>
            p.start_lat !== null && p.start_lng !== null
        )
        .map((p) => {
          const computedDistanceKm = calculateDistanceKm(
            userLat,
            userLng,
            p.start_lat,
            p.start_lng
          );
          return {
            id: p.id,
            name: p.name,
            date: p.date,
            distance_km: p.distance_km,
            difficulty: p.difficulty,
            terrain: p.terrain,
            age_group: p.age_group,
            visibility: p.visibility,
            max_participants: p.max_participants,
            start_lat: p.start_lat,
            start_lng: p.start_lng,
            computedDistanceKm,
            approved_count: counts.get(p.id) ?? 0,
          };
        });

      setCatalog(enriched);
      setLoadingPedals(false);
    };

    fetchPedals();

    return () => {
      isMounted = false;
    };
  }, [userLocation]);

  const filtered = useMemo(
    () => applyPedalFilters(catalog, filters),
    [catalog, filters]
  );

  const pedalsForMap: NearbyPedal[] = useMemo(
    () => filtered.map(toNearbyPedal),
    [filtered]
  );

  const hasAny = pedalsForMap.length > 0;
  const activeCount = countActiveFilters(filters);
  const activeLabels = useMemo(() => describeActiveFilters(filters), [filters]);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_PEDAL_FILTERS);
  }, []);

  const center = useMemo<[number, number] | null>(() => {
    if (userLocation) return userLocation;
    if (hasAny) {
      const p = pedalsForMap[0];
      return [p.start_lat, p.start_lng];
    }
    return null;
  }, [userLocation, hasAny, pedalsForMap]);

  useEffect(() => {
    if (!center) return;
    if (!containerRef.current) return;
    if (typeof window === "undefined") return;
    if (mapRef.current) return;

    const L = require("leaflet") as typeof import("leaflet");

    const map = L.map(containerRef.current, {
      center,
      zoom: 13,
      scrollWheelZoom: false,
      zoomControl: false,
    });
    mapRef.current = map;

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    requestAnimationFrame(() => map.invalidateSize());
    const t = window.setTimeout(() => map.invalidateSize(), 200);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, [center]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [center]);

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    const L = require("leaflet") as typeof import("leaflet");

    const layer = markersLayerRef.current;
    layer.clearLayers();

    const pinIcon = createPedalPinIcon(L);

    if (userLocation) {
      L.circleMarker(userLocation, {
        radius: 8,
        color: "#1B5E20",
        fillColor: "#1B5E20",
        fillOpacity: 0.7,
      }).addTo(layer);
    }

    pedalsForMap.forEach((p) => {
      const marker = L.marker([p.start_lat, p.start_lng], { icon: pinIcon });
      marker.addTo(layer);
      marker.on("click", () => {
        router.push(`/pedals/${p.id}`);
      });
    });
  }, [userLocation, pedalsForMap, router]);

  if (loadingLocation) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-surface">
        <p className="text-sm text-text-secondary">
          Obtendo sua localização…
        </p>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-surface px-6">
        <p className="max-w-md text-center text-sm text-text-secondary">
          {error ?? "Não foi possível carregar o mapa."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="hidden w-[min(100%,20rem)] shrink-0 flex-col border-r border-gray-200 bg-surface lg:flex">
        <div className="shrink-0 border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Pedais próximos</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Filtros aplicados no dispositivo · toque no pin no mapa
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <PedalFilters
            value={filters}
            onChange={setFilters}
            onClear={clearFilters}
          />
        </div>
        <div className="max-h-[40%] min-h-0 shrink-0 overflow-y-auto border-t border-gray-100">
          <p className="sticky top-0 bg-surface px-4 py-2 text-xs font-medium text-text-secondary">
            Resultados ({filtered.length})
          </p>
          {!loadingPedals && filtered.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-text-secondary">
              Nenhum pedal com os filtros selecionados.
            </p>
          ) : (
            <ul className="space-y-1 px-2 pb-3">
              {filtered.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/pedals/${p.id}`}
                    className="block rounded-lg px-2 py-2 text-sm transition-colors hover:bg-primary/5"
                  >
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="mt-0.5 block text-xs text-text-secondary">
                      {formatPedalWhen(p.date)} · {p.computedDistanceKm.toFixed(1)}{" "}
                      km
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-[500] flex flex-col gap-2 px-4 py-3 pr-14 sm:pr-16 lg:pr-4">
          <div className="pointer-events-auto rounded-xl border border-gray-200/80 bg-surface/95 px-4 py-3 shadow-md backdrop-blur-sm ring-1 ring-primary/10 transition-shadow duration-200">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Pedais próximos
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {filtered.length} pedal(is)
                </p>
                {activeLabels.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {activeLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {loadingPedals && (
                  <span
                    className="mt-0.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                    aria-label="Carregando pedais"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setFilterModalOpen(true)}
                  className="relative rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 lg:hidden"
                >
                  Filtros
                  {activeCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                      {activeCount}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div ref={containerRef} className="min-h-0 w-full flex-1" />

        <style>{`
        .pedal-nearby-marker.leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .pedal-pin-wrap {
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .leaflet-container .leaflet-top.leaflet-right {
          margin-top: 12px;
          margin-right: 12px;
        }
        .leaflet-container .leaflet-control-zoom a {
          width: 32px !important;
          height: 32px !important;
          line-height: 30px !important;
          font-size: 18px !important;
          font-weight: 600;
          color: #1b5e20 !important;
          border-color: rgba(27, 94, 32, 0.25) !important;
          background: #ffffff !important;
        }
        .leaflet-container .leaflet-control-zoom a:hover {
          background: linear-gradient(to bottom, #1b5e20, #43a047) !important;
          color: #ffffff !important;
          border-color: transparent !important;
        }
      `}</style>

        {!loadingPedals && !hasAny && (
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[500] lg:left-4">
            <p className="pointer-events-auto rounded-xl border border-gray-200/80 bg-surface/95 px-4 py-3 text-center text-sm text-text-secondary shadow-md backdrop-blur-sm">
              Nenhum pedal encontrado com os filtros selecionados
            </p>
          </div>
        )}
        {error && (
          <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-xl border border-red-100 bg-red-50/95 px-4 py-3 shadow-md backdrop-blur-sm">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
      </div>

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onClear={clearFilters}
      />
    </div>
  );
};

export function NearbyPedalsMap() {
  return <NearbyMapInner />;
}
