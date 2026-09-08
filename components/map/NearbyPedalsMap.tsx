"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  requestUserPosition,
  LOCATION_PERMISSION_MESSAGE,
} from "@/lib/geolocation";
import { loadNearbyPedalsForView } from "@/lib/nearby-pedals";
import type { NearbyPedal } from "./PedalMarker";
import { FilterModal } from "@/components/filters/FilterModal";
import { PedalFilters } from "@/components/filters/PedalFilters";
import { MapFilterChrome } from "@/components/map/MapFilterChrome";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import { NearbyPedalsResultsPanel } from "@/components/home/NearbyPedalsResultsPanel";
import {
  applyPedalFilters,
  countActiveFilters,
  DEFAULT_PEDAL_FILTERS,
  getFilterChips,
  removeFilterChip,
  type EnrichedNearbyPedal,
  type PedalFiltersState,
} from "@/lib/pedal-filters";
import { BIKE_ICON_SRC } from "@/components/pedals/my-pedals-icons";

const PIN_W = 40;
const PIN_H = 54;

function createBikeMarkerIcon(
  L: typeof import("leaflet"),
  selected = false
): ReturnType<typeof L.divIcon> {
  const width = selected ? 46 : PIN_W;
  const height = selected ? 62 : PIN_H;
  return L.divIcon({
    className: "nearby-bike-marker",
    html: `
      <div class="nearby-bike-marker__wrap${selected ? " nearby-bike-marker__wrap--selected" : ""}">
        <svg class="nearby-bike-marker__shape" viewBox="0 0 40 54" aria-hidden="true">
          <path
            d="M20 5c9.5 0 16.5 7.2 16.5 16.5 0 8-8 17-16.5 29C11.5 38.5 3.5 29.5 3.5 21.5 3.5 12.2 10.5 5 20 5Z"
            fill="#2E7D32"
            stroke="#ffffff"
            stroke-width="4"
            stroke-linejoin="round"
          />
        </svg>
        <img src="${BIKE_ICON_SRC}" alt="" class="nearby-bike-marker__icon" />
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [width / 2, height - 2],
  });
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

interface NearbyPedalsMapProps {
  filterModalOpen?: boolean;
  onFilterModalOpenChange?: (open: boolean) => void;
}

const NearbyMapInner = ({
  filterModalOpen: externalFilterOpen,
  onFilterModalOpenChange,
}: NearbyPedalsMapProps) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingPedals, setLoadingPedals] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<EnrichedNearbyPedal[]>([]);
  const [filters, setFilters] = useState<PedalFiltersState>(DEFAULT_PEDAL_FILTERS);
  const [internalFilterOpen, setInternalFilterOpen] = useState(false);
  const [selectedPedalId, setSelectedPedalId] = useState<string | null>(null);

  const filterModalOpen = externalFilterOpen ?? internalFilterOpen;
  const setFilterModalOpen = onFilterModalOpenChange ?? setInternalFilterOpen;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const markerRefsRef = useRef<Map<string, Marker>>(new Map());

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
      const [userLat, userLng] = userLocation;
      const { data, error: fetchError } = await loadNearbyPedalsForView(
        userLat,
        userLng
      );

      if (!isMounted) return;

      if (fetchError) {
        setError("Erro ao carregar pedais próximos.");
        setLoadingPedals(false);
        return;
      }

      setCatalog(data);
      setLoadingPedals(false);
    };

    void fetchPedals();

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
  const filterChips = useMemo(() => getFilterChips(filters), [filters]);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_PEDAL_FILTERS);
  }, []);

  const handleRemoveChip = useCallback((chipId: string) => {
    setFilters((prev) => removeFilterChip(prev, chipId));
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
    if (filtered.length === 0) {
      setSelectedPedalId(null);
      return;
    }
    setSelectedPedalId((prev) => {
      if (prev && filtered.some((p) => p.id === prev)) return prev;
      return filtered[0].id;
    });
  }, [filtered]);

  useEffect(() => {
    if (!center) return;
    if (!containerRef.current) return;
    if (typeof window === "undefined") return;
    if (mapRef.current) return;

    const L = require("leaflet") as typeof import("leaflet");

    const map = L.map(containerRef.current, {
      center,
      zoom: 13,
      scrollWheelZoom: true,
      zoomControl: false,
    });
    mapRef.current = map;

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
      markerRefsRef.current.clear();
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
    markerRefsRef.current.clear();

    if (userLocation) {
      L.circleMarker(userLocation, {
        radius: 8,
        color: "#1B5E20",
        fillColor: "#43A047",
        fillOpacity: 0.85,
        weight: 2,
      }).addTo(layer);
    }

    pedalsForMap.forEach((p) => {
      const isSelected = p.id === selectedPedalId;
      const marker = L.marker([p.start_lat, p.start_lng], {
        icon: createBikeMarkerIcon(L, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });
      marker.addTo(layer);
      markerRefsRef.current.set(p.id, marker);
      marker.on("click", () => {
        setSelectedPedalId(p.id);
        mapRef.current?.panTo([p.start_lat, p.start_lng], {
          animate: true,
          duration: 0.4,
        });
      });
    });
  }, [userLocation, pedalsForMap, selectedPedalId]);

  const handleLocate = useCallback(() => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.setView(userLocation, 14, { animate: true });
  }, [userLocation]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleSelectPedal = useCallback((id: string) => {
    setSelectedPedalId(id);
    const pedal = filtered.find((p) => p.id === id);
    if (pedal && mapRef.current) {
      mapRef.current.panTo([pedal.start_lat, pedal.start_lng], {
        animate: true,
        duration: 0.4,
      });
    }
  }, [filtered]);

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
    <MapFilterChrome
      chips={filterChips}
      activeCount={activeCount}
      onRemoveChip={handleRemoveChip}
      onOpenFilters={() => setFilterModalOpen(true)}
      loading={loadingPedals}
      loadingLabel="Carregando pedais"
      desktopPanel={
        <PedalFilters
          variant="panel"
          value={filters}
          onChange={setFilters}
          onClear={clearFilters}
        />
      }
    >
        <div ref={containerRef} className="absolute inset-0 z-0" />

      <style>{`
        .nearby-bike-marker {
          background: transparent !important;
          border: none !important;
        }
        .nearby-bike-marker__wrap {
          position: relative;
          width: 40px;
          height: 54px;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.28));
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .nearby-bike-marker__wrap--selected {
          width: 46px;
          height: 62px;
          filter: drop-shadow(0 4px 12px rgba(27, 94, 32, 0.45));
        }
        .nearby-bike-marker__shape {
          display: block;
          width: 100%;
          height: 100%;
        }
        .nearby-bike-marker__icon {
          position: absolute;
          top: 11px;
          left: 50%;
          width: 14px;
          height: 10px;
          transform: translateX(-50%);
          object-fit: contain;
          pointer-events: none;
          mix-blend-mode: screen;
        }
        .nearby-bike-marker__wrap--selected .nearby-bike-marker__icon {
          top: 13px;
          width: 16px;
          height: 11px;
        }
      `}</style>

      <MapZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onLocate={handleLocate}
      />

      {/* Results panel */}
      {(hasAny || !loadingPedals) && (
        <NearbyPedalsResultsPanel
          pedals={filtered}
          selectedId={selectedPedalId}
          onSelectPedal={handleSelectPedal}
          loading={loadingPedals}
        />
      )}

      {error ? (
        <div className="absolute bottom-48 left-4 right-4 z-[500] rounded-xl border border-red-100 bg-red-50/95 px-4 py-3 shadow-md backdrop-blur-sm lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-xs">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      ) : null}

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="Filtrar pedais"
      >
        <PedalFilters
          value={filters}
          onChange={setFilters}
          onClear={clearFilters}
        />
      </FilterModal>
    </MapFilterChrome>
  );
};

export function NearbyPedalsMap(props: NearbyPedalsMapProps) {
  return <NearbyMapInner {...props} />;
}
