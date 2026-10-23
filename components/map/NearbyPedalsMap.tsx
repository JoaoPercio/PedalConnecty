"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import {
  requestUserPosition,
  LOCATION_PERMISSION_MESSAGE,
} from "@/lib/geolocation";
import { loadNearbyPedalsForView } from "@/lib/nearby-pedals";
import { FilterModal } from "@/components/filters/FilterModal";
import { PedalFilters } from "@/components/filters/PedalFilters";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import { NearbyPedalsResultsPanel } from "@/components/home/NearbyPedalsResultsPanel";
import { NearbyMapTopBar } from "@/components/home/NearbyMapTopBar";
import { occupancyOf } from "@/components/home/NearbyPedalResultCard";
import {
  applyPedalFilters,
  countActiveFilters,
  DEFAULT_PEDAL_FILTERS,
  DISTANCE_OPTIONS_KM,
  removeFilterChip,
  type EnrichedNearbyPedal,
  type PedalFiltersState,
} from "@/lib/pedal-filters";
import { formatPinLabel } from "@/lib/pedal-display";
import { addBaseTileLayer, MAP_ATTRIBUTION_HTML } from "@/lib/map-tiles";
import {
  addUserDot,
  fitMapToPoints,
  panMapTo,
  USER_DOT_STYLES,
} from "@/components/map/map-ui";
import { reportUsabilityEvent } from "@/usability-tests";
import { shouldCompleteFilterTest } from "@/usability-tests/paths";
import { subscribeUsabilityCurrentTestNumber } from "@/usability-tests/demo-notification";
import {
  ensureDemoPedalInList,
  shouldInjectDemoPedal,
} from "@/usability-tests/demo-pedal";

/** Pin com etiqueta (horário / "Ao vivo"), colorido pela lotação do pedal. */
function createPedalPinIcon(
  L: typeof import("leaflet"),
  pedal: EnrichedNearbyPedal,
  selected: boolean
): ReturnType<typeof L.divIcon> {
  const tone = occupancyOf(pedal);
  const label = tone === "live" ? "Ao vivo" : formatPinLabel(pedal.date);
  const safe = label.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return L.divIcon({
    className: "np-pin-icon",
    html: `
      <div class="np-pin np-pin--${tone}${selected ? " np-pin--selected" : ""}">
        <span class="np-pin__body"><span class="np-pin__dot"></span><span>${safe}</span></span>
        <span class="np-pin__tail"></span>
      </div>`,
    iconSize: [130, 46],
    iconAnchor: [65, 46],
  });
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
  const [pedalsLoaded, setPedalsLoaded] = useState(false);
  const [internalFilterOpen, setInternalFilterOpen] = useState(false);
  const [selectedPedalId, setSelectedPedalId] = useState<string | null>(null);
  const [listFocusNonce, setListFocusNonce] = useState(0);
  const [demoActive, setDemoActive] = useState(shouldInjectDemoPedal);

  const filterModalOpen = externalFilterOpen ?? internalFilterOpen;
  const setFilterModalOpen = onFilterModalOpenChange ?? setInternalFilterOpen;

  // A div do mapa só existe depois de obter a localização. Guardá-la em estado faz o
  // mapa ser (re)criado sempre que ela aparecer — ao voltar pelo histórico a ordem
  // das atualizações muda e um ref deixava o mapa sem ser criado (área em branco).
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [markersLayer, setMarkersLayer] = useState<LayerGroup | null>(null);

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
    const sync = () => setDemoActive(shouldInjectDemoPedal());
    sync();
    return subscribeUsabilityCurrentTestNumber(sync);
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
      setPedalsLoaded(true);
      setLoadingPedals(false);
    };

    void fetchPedals();

    return () => {
      isMounted = false;
    };
  }, [userLocation]);

  const filtered = useMemo(() => {
    const base = applyPedalFilters(catalog, filters);
    if (!demoActive || !userLocation) return base;
    return ensureDemoPedalInList(userLocation[0], userLocation[1], base);
  }, [catalog, filters, demoActive, userLocation]);

  const hasAny = filtered.length > 0;
  const activeCount = countActiveFilters(filters);
  const nextRadiusKm =
    DISTANCE_OPTIONS_KM.find((km) => km > filters.maxDistanceKm) ?? null;

  const handleFiltersChange = useCallback(
    (next: PedalFiltersState) => {
      setFilters(next);
      if (shouldCompleteFilterTest(next, pedalsLoaded)) {
        reportUsabilityEvent({
          type: "pedal_filters_used",
          filters: { ...next },
          resultCount: applyPedalFilters(catalog, next).length,
        });
      }
    },
    [catalog, pedalsLoaded]
  );

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_PEDAL_FILTERS);
  }, []);

  const handleRemoveChip = useCallback(
    (chipId: string) => {
      setFilters((prev) => {
        const next = removeFilterChip(prev, chipId);
        if (shouldCompleteFilterTest(next, pedalsLoaded)) {
          reportUsabilityEvent({
            type: "pedal_filters_used",
            filters: { ...next },
            resultCount: applyPedalFilters(catalog, next).length,
          });
        }
        return next;
      });
    },
    [catalog, pedalsLoaded]
  );

  const center = useMemo<[number, number] | null>(() => {
    if (userLocation) return userLocation;
    if (hasAny) {
      const p = filtered[0];
      return [p.start_lat, p.start_lng];
    }
    return null;
  }, [userLocation, hasAny, filtered]);

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
    if (!containerEl) return;
    if (typeof window === "undefined") return;

    const L = require("leaflet") as typeof import("leaflet");

    const m = L.map(containerEl, {
      center,
      zoom: 13,
      scrollWheelZoom: true,
      zoomControl: false,
      // A atribuição aparece no painel de resultados (o canto do mapa fica coberto).
      attributionControl: false,
    });
    addBaseTileLayer(L, m);
    const layer = L.layerGroup().addTo(m);
    setMap(m);
    setMarkersLayer(layer);

    requestAnimationFrame(() => m.invalidateSize());
    const t = window.setTimeout(() => m.invalidateSize(), 200);

    return () => {
      window.clearTimeout(t);
      m.remove();
      setMap(null);
      setMarkersLayer(null);
    };
  }, [center, containerEl]);

  useEffect(() => {
    if (!containerEl || !map) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerEl);
    return () => ro.disconnect();
  }, [containerEl, map]);

  const panToPedal = useCallback(
    (lat: number, lng: number) => {
      if (map) panMapTo(map, lat, lng);
    },
    [map]
  );

  useEffect(() => {
    if (!map || !markersLayer) return;
    const L = require("leaflet") as typeof import("leaflet");

    markersLayer.clearLayers();

    if (userLocation) addUserDot(L, markersLayer, userLocation);

    filtered.forEach((p) => {
      const isSelected = p.id === selectedPedalId;
      const marker = L.marker([p.start_lat, p.start_lng], {
        icon: createPedalPinIcon(L, p, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
        title: p.name,
      });
      marker.addTo(markersLayer);
      marker.on("click", () => {
        setSelectedPedalId(p.id);
        setListFocusNonce((n) => n + 1);
        panToPedal(p.start_lat, p.start_lng);
      });
    });
  }, [map, markersLayer, userLocation, filtered, selectedPedalId, panToPedal]);

  // Enquadra você e os pedais visíveis ao carregar e quando o resultado muda.
  const filteredKey = filtered.map((p) => p.id).join(",");
  useEffect(() => {
    if (!map || !pedalsLoaded) return;
    const L = require("leaflet") as typeof import("leaflet");
    const points: [number, number][] = filtered.map((p) => [p.start_lat, p.start_lng]);
    if (userLocation) points.push(userLocation);
    fitMapToPoints(L, map, points);
    // `filteredKey` resume `filtered`: só reenquadra quando o conjunto de pedais muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pedalsLoaded, filteredKey, userLocation]);

  const handleLocate = useCallback(() => {
    if (!map || !userLocation) return;
    map.setView(userLocation, 14, { animate: true });
  }, [map, userLocation]);

  const handleZoomIn = useCallback(() => {
    map?.zoomIn();
  }, [map]);

  const handleZoomOut = useCallback(() => {
    map?.zoomOut();
  }, [map]);

  const handleSelectPedal = useCallback(
    (id: string) => {
      setSelectedPedalId(id);
      const pedal = filtered.find((p) => p.id === id);
      if (pedal) panToPedal(pedal.start_lat, pedal.start_lng);
    },
    [filtered, panToPedal]
  );

  if (loadingLocation) {
    return (
      <div className="relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#e9efe9]">
        <div
          className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_30%_40%,#dfe8df_0,transparent_40%),radial-gradient(circle_at_70%_65%,#dde6ef_0,transparent_35%)] motion-reduce:animate-none"
          aria-hidden
        />
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-xl">
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
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
    <div className="relative h-full min-h-0 flex-1 overflow-hidden">
      <div ref={setContainerEl} className="absolute inset-0 z-0" />

      <style>{`
        .np-pin-icon { background: transparent !important; border: none !important; }
        .np-pin {
          width: 130px; height: 46px;
          display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
          transition: transform .2s ease;
          transform-origin: 50% 100%;
        }
        .np-pin__body {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 11px; border-radius: 9999px;
          background: #fff; color: #1C1C1C;
          font: 700 12px/1 var(--font-geist-sans), system-ui, sans-serif;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(15, 23, 42, .25), 0 0 0 1px rgba(15, 23, 42, .06);
        }
        .np-pin__dot { width: 8px; height: 8px; border-radius: 9999px; background: #2E7D32; flex-shrink: 0; }
        .np-pin__tail {
          width: 0; height: 0; margin-top: -1px;
          border-left: 6px solid transparent; border-right: 6px solid transparent;
          border-top: 7px solid #fff;
          filter: drop-shadow(0 2px 1px rgba(15, 23, 42, .15));
        }
        .np-pin--few .np-pin__dot { background: #F59E0B; }
        .np-pin--full .np-pin__body { color: #6B7280; }
        .np-pin--full .np-pin__dot { background: #9CA3AF; }
        .np-pin--live .np-pin__body { background: #EF4444; color: #fff; }
        .np-pin--live .np-pin__tail { border-top-color: #EF4444; }
        .np-pin--live .np-pin__dot { background: #fff; animation: np-blink 1.2s ease-in-out infinite; }
        .np-pin--selected { transform: scale(1.14); }
        .np-pin--selected .np-pin__body { background: #1B5E20; color: #fff; box-shadow: 0 6px 18px rgba(27, 94, 32, .45); }
        .np-pin--selected .np-pin__tail { border-top-color: #1B5E20; }
        .np-pin--selected .np-pin__dot { background: #fff; }
        @keyframes np-blink { 50% { opacity: .3; } }
        ${USER_DOT_STYLES}
        @media (prefers-reduced-motion: reduce) {
          .np-pin--live .np-pin__dot { animation: none; }
          .np-pin { transition: none; }
        }
      `}</style>

      <NearbyMapTopBar
        filters={filters}
        activeCount={activeCount}
        onFiltersChange={handleFiltersChange}
        onRemoveChip={handleRemoveChip}
        onOpenFilters={() => setFilterModalOpen(true)}
        loading={loadingPedals}
      />

      {/* Desktop: painel de filtros fixo à esquerda */}
      <aside className="pointer-events-none absolute left-4 top-4 z-[500] hidden max-h-[calc(100%-2rem)] w-72 lg:flex">
        <div className="pointer-events-auto min-h-0 w-full overflow-y-auto rounded-3xl bg-surface/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-xl">
          <PedalFilters
            variant="panel"
            value={filters}
            onChange={handleFiltersChange}
            onClear={clearFilters}
          />
        </div>
      </aside>

      {/* Zoom só no desktop; no celular a pinça já faz isso. */}
      <div className="hidden lg:block">
        <MapZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onLocate={handleLocate}
        />
      </div>
      <p
        className="pointer-events-auto absolute bottom-1 right-24 z-[400] hidden rounded bg-white/70 px-1.5 text-[10px] text-text-secondary lg:block [&_a]:underline"
        // Constante estática (atribuição exigida pelos provedores do mapa).
        dangerouslySetInnerHTML={{ __html: MAP_ATTRIBUTION_HTML }}
      />

      <NearbyPedalsResultsPanel
        pedals={filtered}
        selectedId={selectedPedalId}
        onSelectPedal={handleSelectPedal}
        loading={loadingPedals || !pedalsLoaded}
        focusNonce={listFocusNonce}
        onLocate={handleLocate}
        nextRadiusKm={nextRadiusKm}
        onExpandRadius={
          nextRadiusKm
            ? () => handleFiltersChange({ ...filters, maxDistanceKm: nextRadiusKm })
            : undefined
        }
        hasActiveFilters={activeCount > 0}
        onClearFilters={clearFilters}
      />

      {error ? (
        <div className="absolute inset-x-3 top-28 z-[650] rounded-2xl border border-red-100 bg-red-50/95 px-4 py-3 shadow-md backdrop-blur-sm lg:left-auto lg:right-4 lg:max-w-xs">
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
          onChange={handleFiltersChange}
          onClear={clearFilters}
        />
      </FilterModal>
    </div>
  );
};

export function NearbyPedalsMap(props: NearbyPedalsMapProps) {
  return <NearbyMapInner {...props} />;
}
