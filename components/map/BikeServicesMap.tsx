"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  requestUserPosition,
  LOCATION_PERMISSION_MESSAGE,
} from "@/lib/geolocation";
import {
  fetchBikeServices,
  haversineKm,
  kindLabel,
  type BikeServiceKind,
  type BikeServicePlace,
} from "@/lib/bike-services-overpass";
import { bikeServiceKindStyle, createKindIcon } from "@/components/map/BikeServiceMarker";
import { BikeServiceCard } from "@/components/map/BikeServiceCard";
import { MapCardSkeleton } from "@/components/map/MapAlertCard";
import { MAP_PIN_STYLES } from "@/components/map/MapPinIcon";
import { FilterModal } from "@/components/filters/FilterModal";
import { CategoryFilters } from "@/components/filters/CategoryFilters";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import {
  MapEmptyState,
  MapResultsSheet,
  mapSecondaryActionClass,
} from "@/components/map/MapResultsSheet";
import {
  addUserDot,
  CategoryChips,
  fitMapToPoints,
  MapLocateButton,
  MapTopBar,
  panMapTo,
  USER_DOT_STYLES,
} from "@/components/map/map-ui";
import {
  allCategoriesSelected,
  countActiveCategoryFilters,
} from "@/lib/category-filters";
import { reportUsabilityEvent } from "@/usability-tests";
import { addBaseTileLayer, MAP_ATTRIBUTION_HTML } from "@/lib/map-tiles";

const ZOOM = 12;
const SEARCH_RADIUS_KM = 30;
/** Ao enquadrar, considera só os locais mais próximos (evita zoom muito aberto). */
const FIT_NEAREST = 10;
/** Card do carrossel tem os botões "Como chegar"/"Ligar": painel recolhido mais alto. */
const SHOPS_PEEK_HEIGHT = 216;

const KIND_ORDER: BikeServiceKind[] = [
  "loja",
  "oficina",
  "aluguel",
  "estacao",
  "posto",
];

const KIND_FILTER_OPTIONS = KIND_ORDER.map((k) => ({
  id: k,
  label: `${bikeServiceKindStyle(k).emoji} ${kindLabel(k)}`,
}));

function placeKey(p: BikeServicePlace): string {
  return `${p.osmType}-${p.id}`;
}

type PlaceWithDistance = BikeServicePlace & { distanceKm: number };

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
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [filters, setFilters] = useState<Record<BikeServiceKind, boolean>>(
    () => allCategoriesSelected(KIND_ORDER)
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [internalFilterOpen, setInternalFilterOpen] = useState(false);

  const filterModalOpen = externalFilterOpen ?? internalFilterOpen;
  const setFilterModalOpen = onFilterModalOpenChange ?? setInternalFilterOpen;

  // Div do mapa em estado: o mapa é (re)criado sempre que ela aparece (evita a área
  // em branco ao voltar pelo histórico — ver NearbyPedalsMap).
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [poiLayer, setPoiLayer] = useState<L.LayerGroup | null>(null);

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
      setPlacesLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userPos, reloadNonce]);

  const visiblePlaces = useMemo<PlaceWithDistance[]>(() => {
    const list = places.filter((p) => filters[p.kind]);
    if (!userPos) return list.map((p) => ({ ...p, distanceKm: 0 }));
    return list
      .map((p) => ({ ...p, distanceKm: haversineKm(userPos[0], userPos[1], p.lat, p.lng) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [places, filters, userPos]);

  useEffect(() => {
    if (selectedId && !visiblePlaces.some((p) => placeKey(p) === selectedId)) {
      setSelectedId(null);
    }
  }, [visiblePlaces, selectedId]);

  useEffect(() => {
    if (!userPos || !containerEl) return;

    const m = L.map(containerEl, {
      scrollWheelZoom: true,
      zoomControl: false,
      // A atribuição aparece no painel de resultados (o canto do mapa fica coberto).
      attributionControl: false,
    }).setView(userPos, ZOOM);
    addBaseTileLayer(L, m);
    const layer = L.layerGroup().addTo(m);
    m.on("click", () => setSelectedId(null));

    setMap(m);
    setPoiLayer(layer);
    requestAnimationFrame(() => m.invalidateSize());

    return () => {
      m.remove();
      setMap(null);
      setPoiLayer(null);
    };
  }, [userPos, containerEl]);

  useEffect(() => {
    if (!containerEl || !map) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerEl);
    return () => ro.disconnect();
  }, [containerEl, map]);

  /** Seleção feita pelo usuário (pin, card ou carrossel): conta para o teste 9. */
  const selectPlace = useCallback(
    (id: string) => {
      setSelectedId(id);
      const place = visiblePlaces.find((p) => placeKey(p) === id);
      if (!place) return;
      if (map) panMapTo(map, place.lat, place.lng);
      reportUsabilityEvent({
        type: "bike_service_viewed",
        placeId: String(place.id),
        placeName: place.name,
      });
    },
    [visiblePlaces, map]
  );

  useEffect(() => {
    if (!map || !poiLayer || !userPos) return;

    poiLayer.clearLayers();
    addUserDot(L, poiLayer, userPos);

    visiblePlaces.forEach((place) => {
      const id = placeKey(place);
      const selected = id === selectedId;
      const marker = L.marker([place.lat, place.lng], {
        icon: createKindIcon(place.kind, selected),
        zIndexOffset: selected ? 1000 : 0,
        title: place.name,
      });
      marker.on("click", (ev: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(ev);
        setFocusNonce((n) => n + 1);
        selectPlace(id);
      });
      marker.addTo(poiLayer);
    });
  }, [map, poiLayer, visiblePlaces, userPos, selectedId, selectPlace]);

  // Enquadra você e os locais mais próximos ao carregar e ao mudar o filtro.
  const filterKey = KIND_ORDER.map((k) => (filters[k] ? 1 : 0)).join("");
  useEffect(() => {
    if (!map || !userPos || !placesLoaded) return;
    const points: [number, number][] = visiblePlaces
      .slice(0, FIT_NEAREST)
      .map((p) => [p.lat, p.lng]);
    points.push(userPos);
    fitMapToPoints(L, map, points, ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, userPos, placesLoaded, filterKey]);

  const handleLocate = useCallback(() => {
    if (!map || !userPos) return;
    map.setView(userPos, 14, { animate: true });
  }, [map, userPos]);

  const clearFilters = useCallback(() => {
    setFilters(allCategoriesSelected(KIND_ORDER));
  }, []);

  const handleCategoryChange = useCallback((id: string, next: boolean) => {
    setFilters((prev) => ({ ...prev, [id]: next }));
  }, []);

  const activeCount = countActiveCategoryFilters(filters, KIND_ORDER);

  if (loadingLocation) {
    return (
      <div className="relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#e9efe9]">
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-xl">
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
          Obtendo sua localização…
        </p>
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

  const count = visiblePlaces.length;
  const loadingFirst = !placesLoaded || (loadingPlaces && places.length === 0);
  const title = loadingFirst
    ? "Buscando lojas e serviços…"
    : fetchError && places.length === 0
      ? "Não foi possível carregar"
      : count === 0
      ? "Nenhum local por perto"
      : count === 1
        ? "1 local perto de você"
        : `${count} locais perto de você`;

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden">
      <div ref={setContainerEl} className="absolute inset-0 z-0 touch-manipulation" />

      <MapTopBar
        icon={<span className="text-base leading-none">🏪</span>}
        title="Lojas e serviços"
        subtitle={`até ${SEARCH_RADIUS_KM} km`}
        activeCount={activeCount}
        onOpenFilters={() => setFilterModalOpen(true)}
        loading={loadingPlaces}
        loadingLabel="Carregando lojas"
      >
        <CategoryChips options={KIND_FILTER_OPTIONS} value={filters} onChange={setFilters} />
      </MapTopBar>

      {/* Desktop: filtros fixos à esquerda */}
      <aside className="pointer-events-none absolute left-4 top-4 z-[500] hidden max-h-[calc(100%-2rem)] w-72 lg:flex">
        <div className="pointer-events-auto min-h-0 w-full overflow-y-auto rounded-3xl bg-surface/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-xl">
          <CategoryFilters
            variant="panel"
            options={KIND_FILTER_OPTIONS}
            value={filters}
            onChange={handleCategoryChange}
            onClear={clearFilters}
          />
        </div>
      </aside>

      {/* Zoom só no desktop; no celular a pinça já faz isso. */}
      <div className="hidden lg:block">
        <MapZoomControls
          onZoomIn={() => map?.zoomIn()}
          onZoomOut={() => map?.zoomOut()}
          onLocate={handleLocate}
        />
      </div>
      <p
        className="pointer-events-auto absolute bottom-1 right-2 z-[400] hidden rounded bg-white/70 px-1.5 text-[10px] text-text-secondary lg:block [&_a]:underline"
        // Constante estática (atribuição exigida pelos provedores do mapa).
        dangerouslySetInnerHTML={{ __html: MAP_ATTRIBUTION_HTML }}
      />

      <MapResultsSheet
        items={visiblePlaces}
        getId={placeKey}
        renderCard={(p, { selected, variant, onSelect }) => (
          <BikeServiceCard
            place={p}
            distanceKm={p.distanceKm}
            selected={selected}
            variant={variant}
            onSelect={onSelect}
          />
        )}
        renderSkeleton={() => <MapCardSkeleton />}
        selectedId={selectedId}
        onSelect={selectPlace}
        focusNonce={focusNonce}
        loading={loadingFirst}
        title={title}
        ariaLabel="Lojas e serviços próximos"
        collapseOnListSelect
        peekHeight={SHOPS_PEEK_HEIGHT}
        controls={<MapLocateButton onClick={handleLocate} />}
        notice={
          fetchError ? (
            <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2">
              <p className="flex-1 text-xs text-red-700">Erro ao buscar locais. O serviço do mapa pode estar lento.</p>
              <button
                type="button"
                onClick={() => setReloadNonce((n) => n + 1)}
                className="min-h-9 shrink-0 rounded-full bg-white px-3 text-xs font-semibold text-red-700 ring-1 ring-red-200"
              >
                Tentar de novo
              </button>
            </div>
          ) : undefined
        }
        emptyState={
          fetchError ? null : (
            <MapEmptyState
              icon="🔍"
              title="Nada encontrado por aqui"
              description={
                activeCount > 0
                  ? "Nenhum local desse tipo por perto."
                  : `Nenhuma loja, oficina ou serviço mapeado num raio de ${SEARCH_RADIUS_KM} km.`
              }
              actions={
                activeCount > 0 ? (
                  <button type="button" onClick={clearFilters} className={mapSecondaryActionClass}>
                    Mostrar todos os tipos
                  </button>
                ) : null
              }
            />
          )
        }
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
        ${USER_DOT_STYLES}
      `}</style>
    </div>
  );
}
