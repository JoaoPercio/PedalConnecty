"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  requestUserPosition,
  LOCATION_PERMISSION_MESSAGE,
} from "@/lib/geolocation";
import {
  fetchBikeServices,
  kindLabel,
  type BikeServiceKind,
  type BikeServicePlace,
} from "@/lib/bike-services-overpass";
import {
  buildBikeServicePopupHtml,
  createKindIcons,
} from "@/components/map/BikeServiceMarker";
import { MAP_PIN_STYLES } from "@/components/map/MapPinIcon";
import { FilterModal } from "@/components/filters/FilterModal";
import { CategoryFilters } from "@/components/filters/CategoryFilters";
import { MapFilterChrome } from "@/components/map/MapFilterChrome";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import {
  allCategoriesSelected,
  countActiveCategoryFilters,
  getCategoryFilterChips,
  removeCategoryFilterChip,
} from "@/lib/category-filters";

const ZOOM = 12;

const KIND_ORDER: BikeServiceKind[] = [
  "loja",
  "oficina",
  "aluguel",
  "estacao",
  "posto",
];

const KIND_FILTER_OPTIONS = KIND_ORDER.map((k) => ({
  id: k,
  label: kindLabel(k),
}));

interface BikeServicesMapProps {
  filterModalOpen?: boolean;
  onFilterModalOpenChange?: (open: boolean) => void;
}

export function BikeServicesMap({
  filterModalOpen: externalFilterOpen,
  onFilterModalOpenChange,
}: BikeServicesMapProps) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [places, setPlaces] = useState<BikeServicePlace[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [filters, setFilters] = useState<Record<BikeServiceKind, boolean>>(
    () => allCategoriesSelected(KIND_ORDER)
  );
  const [internalFilterOpen, setInternalFilterOpen] = useState(false);

  const filterModalOpen = externalFilterOpen ?? internalFilterOpen;
  const setFilterModalOpen = onFilterModalOpenChange ?? setInternalFilterOpen;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const poiLayerRef = useRef<L.LayerGroup | null>(null);

  const icons = useMemo(() => createKindIcons(), []);

  useEffect(() => {
    let cancelled = false;
    setLoadingLocation(true);
    setLocationDenied(false);
    requestUserPosition()
      .then((pos) => {
        if (cancelled) return;
        setUserPos(pos);
      })
      .catch(() => {
        if (cancelled) return;
        setLocationDenied(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingLocation(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userPos) return;

    let cancelled = false;
    setLoadingPlaces(true);
    setFetchError(false);

    fetchBikeServices(userPos[0], userPos[1]).then(({ places: list, error }) => {
      if (cancelled) return;
      setPlaces(list);
      setFetchError(error !== null);
      setLoadingPlaces(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userPos]);

  const visiblePlaces = useMemo(
    () => places.filter((p) => filters[p.kind]),
    [places, filters]
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!userPos || !el) return;
    if (mapRef.current) return;

    const map = L.map(el, { scrollWheelZoom: true, zoomControl: false }).setView(
      userPos,
      ZOOM
    );
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.circleMarker(userPos, {
      radius: 9,
      color: "#1B5E20",
      fillColor: "#1B5E20",
      fillOpacity: 0.85,
      weight: 2,
    }).addTo(map);

    const poiLayer = L.layerGroup().addTo(map);
    poiLayerRef.current = poiLayer;

    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      poiLayerRef.current = null;
    };
  }, [userPos]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [userPos]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = poiLayerRef.current;
    if (!map || !layer || !userPos) return;

    layer.clearLayers();

    visiblePlaces.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: icons[place.kind],
      });
      marker.bindPopup(
        buildBikeServicePopupHtml(place, userPos[0], userPos[1]),
        { maxWidth: 280 }
      );
      marker.addTo(layer);
    });
  }, [visiblePlaces, userPos, icons]);

  const handleLocate = useCallback(() => {
    if (!mapRef.current || !userPos) return;
    mapRef.current.setView(userPos, ZOOM, { animate: true });
  }, [userPos]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(allCategoriesSelected(KIND_ORDER));
  }, []);

  const handleRemoveChip = useCallback((chipId: string) => {
    setFilters((prev) => removeCategoryFilterChip(prev, chipId, KIND_ORDER));
  }, []);

  const handleCategoryChange = useCallback((id: string, next: boolean) => {
    setFilters((prev) => ({ ...prev, [id]: next }));
  }, []);

  const filterChips = useMemo(
    () => getCategoryFilterChips(filters, KIND_FILTER_OPTIONS),
    [filters]
  );
  const activeCount = countActiveCategoryFilters(filters, KIND_ORDER);

  if (loadingLocation) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!userPos) {
    if (locationDenied) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-surface px-6 text-center">
          <p className="max-w-md text-sm text-foreground">
            {LOCATION_PERMISSION_MESSAGE}
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <MapFilterChrome
      chips={filterChips}
      activeCount={activeCount}
      onRemoveChip={handleRemoveChip}
      onOpenFilters={() => setFilterModalOpen(true)}
      loading={loadingPlaces}
      loadingLabel="Carregando lojas"
      desktopPanel={
        <CategoryFilters
          variant="panel"
          options={KIND_FILTER_OPTIONS}
          value={filters}
          onChange={handleCategoryChange}
          onClear={clearFilters}
        />
      }
    >
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 touch-manipulation"
      />

      {fetchError ? (
        <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-xl border border-red-100 bg-red-50/95 px-4 py-3 shadow-md backdrop-blur-sm lg:left-auto lg:right-4 lg:max-w-xs">
          <p className="text-xs text-red-700">
            Erro ao buscar locais. Tente novamente.
          </p>
        </div>
      ) : null}

      {!loadingPlaces && !fetchError && places.length === 0 ? (
        <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-xl border border-gray-200 bg-surface/95 px-4 py-3 shadow-md backdrop-blur-sm lg:left-auto lg:right-4 lg:max-w-xs">
          <p className="text-xs text-text-secondary">
            Nenhum local encontrado em um raio de 30km
          </p>
        </div>
      ) : null}

      <MapZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onLocate={handleLocate}
      />

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="Filtrar lojas e serviços"
      >
        <CategoryFilters
          options={KIND_FILTER_OPTIONS}
          value={filters}
          onChange={handleCategoryChange}
          onClear={clearFilters}
        />
      </FilterModal>

      <style>{`
        ${MAP_PIN_STYLES}
      `}</style>
    </MapFilterChrome>
  );
}
