"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLocation } from "@/hooks/useUserLocation";
import { LocationFallback } from "@/components/location/LocationFallback";
import { LocationChip } from "@/components/location/LocationChip";
import {
  deleteMapAlert,
  insertMapAlert,
  loadMapAlertsForView,
  mapAlertPinColors,
  mapAlertTypeMeta,
  MAP_ALERT_CREATE_COOLDOWN_MS,
  MAP_ALERT_TYPE_OPTIONS,
  type MapAlertType,
  type MapAlertWithProfile,
} from "@/lib/map-alerts";
import { haversineKm } from "@/lib/bike-services-overpass";
import { MapAlertsCreateModal } from "@/components/map/MapAlertsCreateModal";
import { createMapPinIcon, MAP_PIN_STYLES } from "@/components/map/MapPinIcon";
import { FilterModal } from "@/components/filters/FilterModal";
import { CategoryFilters } from "@/components/filters/CategoryFilters";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { MapAlertCard, MapCardSkeleton } from "@/components/map/MapAlertCard";
import {
  MapEmptyState,
  mapPrimaryActionClass,
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
import { addBaseTileLayer, MAP_ATTRIBUTION_HTML } from "@/lib/map-tiles";

const ZOOM = 14;
const ALERTS_RADIUS_KM = 30;
/** Ao enquadrar, considera só os alertas mais próximos (evita zoom muito aberto). */
const FIT_NEAREST = 10;

const ALERT_TYPE_KEYS = MAP_ALERT_TYPE_OPTIONS.map((o) => o.value);
const ALERT_FILTER_OPTIONS = MAP_ALERT_TYPE_OPTIONS.map((o) => ({
  id: o.value,
  label: `${o.emoji} ${o.label}`,
}));

function alertLatLng(a: MapAlertWithProfile): [number, number] {
  return [Number(a.lat), Number(a.lng)];
}

function createAlertDivIcon(type: MapAlertType, selected: boolean): L.DivIcon {
  const { emoji } = mapAlertTypeMeta(type);
  return createMapPinIcon({
    L,
    className: `map-alert-marker${selected ? " is-selected" : ""}`,
    colors: mapAlertPinColors(type),
    content: { content: emoji, fontSize: 14, kind: "emoji" },
  });
}

interface MapAlertsMapProps {
  filterModalOpen?: boolean;
  onFilterModalOpenChange?: (open: boolean) => void;
}

type AlertWithDistance = MapAlertWithProfile & { distanceKm: number };

export function MapAlertsMap({
  filterModalOpen: externalFilterOpen,
  onFilterModalOpenChange,
}: MapAlertsMapProps) {
  const { user } = useAuth();
  const location = useUserLocation();
  const userPos = location.position;
  const loadingLocation = location.loading && !userPos;
  const [alerts, setAlerts] = useState<MapAlertWithProfile[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [typeFilters, setTypeFilters] = useState<Record<MapAlertType, boolean>>(
    () => allCategoriesSelected(ALERT_TYPE_KEYS)
  );
  const [internalFilterOpen, setInternalFilterOpen] = useState(false);

  const filterModalOpen = externalFilterOpen ?? internalFilterOpen;
  const setFilterModalOpen = onFilterModalOpenChange ?? setInternalFilterOpen;

  const lastCreateAtRef = useRef(0);
  // Div do mapa em estado: o mapa é (re)criado sempre que ela aparece (evita a área
  // em branco ao voltar pelo histórico — ver NearbyPedalsMap).
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [markersLayer, setMarkersLayer] = useState<L.LayerGroup | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!userPos) return;
    setLoadingAlerts(true);
    setFetchError(null);
    const { data, error } = await loadMapAlertsForView(userPos[0], userPos[1], ALERTS_RADIUS_KM);
    if (error) {
      setFetchError("Não foi possível carregar os alertas.");
      setAlerts([]);
    } else {
      setAlerts(data);
    }
    setLoadingAlerts(false);
    setAlertsLoaded(true);
  }, [userPos]);

  useEffect(() => {
    if (!userPos) return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadAlerts();
    };
    void run();
    const id = window.setInterval(() => {
      void run();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [userPos, loadAlerts]);

  const visibleAlerts = useMemo<AlertWithDistance[]>(() => {
    const list = alerts.filter((a) => typeFilters[a.type]);
    if (!userPos) return list.map((a) => ({ ...a, distanceKm: 0 }));
    return list
      .map((a) => ({
        ...a,
        distanceKm: haversineKm(userPos[0], userPos[1], Number(a.lat), Number(a.lng)),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [alerts, typeFilters, userPos]);

  useEffect(() => {
    if (selectedId && !visibleAlerts.some((a) => a.id === selectedId)) {
      setSelectedId(null);
    }
  }, [visibleAlerts, selectedId]);

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
    const effectLayer = L.layerGroup().addTo(m);

    // Toque no mapa: fecha a seleção e mostra um "pulso" de feedback.
    m.on("click", (e: L.LeafletMouseEvent) => {
      setSelectedId(null);
      const pulse = L.circle(e.latlng, {
        radius: 42,
        color: "#1B5E20",
        fillColor: "#43A047",
        fillOpacity: 0.22,
        weight: 2,
        interactive: false,
      });
      pulse.addTo(effectLayer);
      window.setTimeout(() => {
        try {
          effectLayer.removeLayer(pulse);
        } catch {
          /* map may be gone */
        }
      }, 480);
    });

    setMap(m);
    setMarkersLayer(layer);
    requestAnimationFrame(() => m.invalidateSize());

    return () => {
      m.remove();
      setMap(null);
      setMarkersLayer(null);
    };
  }, [userPos, containerEl]);

  useEffect(() => {
    if (!containerEl || !map) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerEl);
    return () => ro.disconnect();
  }, [containerEl, map]);

  const selectAlert = useCallback(
    (id: string) => {
      setSelectedId(id);
      const a = visibleAlerts.find((x) => x.id === id);
      if (a && map) panMapTo(map, Number(a.lat), Number(a.lng));
    },
    [visibleAlerts, map]
  );

  useEffect(() => {
    if (!map || !markersLayer || !userPos) return;

    markersLayer.clearLayers();
    addUserDot(L, markersLayer, userPos);

    visibleAlerts.forEach((a) => {
      const selected = a.id === selectedId;
      const marker = L.marker(alertLatLng(a), {
        icon: createAlertDivIcon(a.type, selected),
        zIndexOffset: selected ? 1000 : 0,
        title: mapAlertTypeMeta(a.type).label,
      });
      marker.addTo(markersLayer);
      marker.on("click", (ev: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(ev);
        setFocusNonce((n) => n + 1);
        selectAlert(a.id);
      });
    });
  }, [map, markersLayer, visibleAlerts, userPos, selectedId, selectAlert]);

  // Enquadra você e os alertas mais próximos ao carregar e ao mudar o filtro
  // (não a cada atualização automática de 30s, para não mexer no mapa sozinho).
  const filterKey = ALERT_TYPE_KEYS.map((k) => (typeFilters[k] ? 1 : 0)).join("");
  useEffect(() => {
    if (!map || !userPos || !alertsLoaded) return;
    const points: [number, number][] = visibleAlerts
      .slice(0, FIT_NEAREST)
      .map((a) => alertLatLng(a));
    points.push(userPos);
    fitMapToPoints(L, map, points, ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, userPos, alertsLoaded, filterKey]);

  const handleLocate = useCallback(() => {
    if (!map || !userPos) return;
    map.setView(userPos, ZOOM, { animate: true });
  }, [map, userPos]);

  const openCreateModal = () => {
    if (!user) {
      toast.error("Faça login para criar alertas.");
      return;
    }
    if (!userPos) {
      toast.error("Precisamos da sua localização para criar um alerta.");
      return;
    }
    // O alerta marca um ponto exato da via; o centro de uma cidade escolhida à mão não serve.
    if (location.source === "manual") {
      toast.error("Para criar um alerta, libere o acesso à localização do dispositivo.");
      void location.retry();
      return;
    }
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (type: MapAlertType, description: string) => {
    if (!user || !userPos) {
      toast.error("Não foi possível criar o alerta.");
      return;
    }
    const elapsed = Date.now() - lastCreateAtRef.current;
    if (lastCreateAtRef.current > 0 && elapsed < MAP_ALERT_CREATE_COOLDOWN_MS) {
      const wait = Math.ceil((MAP_ALERT_CREATE_COOLDOWN_MS - elapsed) / 1000);
      toast.error(`Aguarde ${wait}s antes de publicar outro alerta.`);
      return;
    }

    setCreateSubmitting(true);
    const { error } = await insertMapAlert({
      userId: user.id,
      type,
      description: description.length > 0 ? description : null,
      lat: userPos[0],
      lng: userPos[1],
    });
    setCreateSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    lastCreateAtRef.current = Date.now();
    toast.success("Alerta criado com sucesso");
    setCreateModalOpen(false);
    await loadAlerts();
  };

  const handleDelete = async (alert: MapAlertWithProfile) => {
    if (!user || alert.user_id !== user.id) return;
    if (!window.confirm("Excluir este alerta?")) return;
    const { error } = await deleteMapAlert(alert.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Alerta removido");
    setSelectedId(null);
    await loadAlerts();
  };

  const clearFilters = useCallback(() => {
    setTypeFilters(allCategoriesSelected(ALERT_TYPE_KEYS));
  }, []);

  const handleCategoryChange = useCallback((id: string, next: boolean) => {
    setTypeFilters((prev) => ({ ...prev, [id]: next }));
  }, []);

  const activeCount = countActiveCategoryFilters(typeFilters, ALERT_TYPE_KEYS);

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
    return (
      <LocationFallback
        errorKind={location.errorKind ?? "failed"}
        onRetry={location.retry}
        onManual={location.setManual}
      />
    );
  }

  const count = visibleAlerts.length;
  const loadingFirst = !alertsLoaded;
  const title = loadingFirst
    ? "Buscando alertas…"
    : fetchError
      ? "Não foi possível carregar"
      : count === 0
      ? "Nenhum alerta por perto"
      : count === 1
        ? "1 alerta ativo perto de você"
        : `${count} alertas ativos perto de você`;

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden">
      <div ref={setContainerEl} className="absolute inset-0 z-0 touch-manipulation" />

      <MapTopBar
        icon={<span className="text-base leading-none">⚠️</span>}
        title="Alertas perto de você"
        subtitle={`até ${ALERTS_RADIUS_KM} km`}
        activeCount={activeCount}
        onOpenFilters={() => setFilterModalOpen(true)}
        loading={loadingAlerts}
        loadingLabel="Atualizando alertas"
      >
        <LocationChip location={location} />
        <CategoryChips options={ALERT_FILTER_OPTIONS} value={typeFilters} onChange={setTypeFilters} />
      </MapTopBar>

      {/* Desktop: filtros fixos à esquerda */}
      <aside className="pointer-events-none absolute left-4 top-4 z-[500] hidden max-h-[calc(100%-2rem)] w-72 lg:flex">
        <div className="pointer-events-auto min-h-0 w-full overflow-y-auto rounded-3xl bg-surface/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-xl">
          <CategoryFilters
            variant="panel"
            options={ALERT_FILTER_OPTIONS}
            value={typeFilters}
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
        className="pointer-events-auto absolute bottom-1 right-24 z-[400] hidden rounded bg-white/70 px-1.5 text-[10px] text-text-secondary lg:block [&_a]:underline"
        // Constante estática (atribuição exigida pelos provedores do mapa).
        dangerouslySetInnerHTML={{ __html: MAP_ATTRIBUTION_HTML }}
      />
      <FloatingActionButton
        hideBelowLg
        onClick={openCreateModal}
        label="Criar alerta"
        ariaLabel="Criar alerta"
        hintKey="pc-create-alert-hint-desktop"
      />

      <MapResultsSheet
        items={visibleAlerts}
        getId={(a) => a.id}
        renderCard={(a, { selected, variant, onSelect }) => (
          <MapAlertCard
            alert={a}
            distanceKm={a.distanceKm}
            selected={selected}
            variant={variant}
            onSelect={onSelect}
            isOwn={!!user && a.user_id === user.id}
            onDelete={() => void handleDelete(a)}
          />
        )}
        renderSkeleton={() => <MapCardSkeleton />}
        selectedId={selectedId}
        onSelect={selectAlert}
        focusNonce={focusNonce}
        loading={loadingFirst}
        title={title}
        ariaLabel="Alertas próximos"
        collapseOnListSelect
        controls={
          <>
            <MapLocateButton onClick={handleLocate} />
            <FloatingActionButton
              placement="inline"
              onClick={openCreateModal}
              label="Criar alerta"
              ariaLabel="Criar alerta"
              hintKey="pc-create-alert-hint"
            />
          </>
        }
        notice={
          fetchError ? (
            <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2">
              <p className="flex-1 text-xs text-red-700">{fetchError}</p>
              <button
                type="button"
                onClick={() => void loadAlerts()}
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
              icon="🎉"
              title="Caminho livre!"
              description={
                activeCount > 0
                  ? "Nenhum alerta desse tipo por perto."
                  : `Nenhum alerta ativo num raio de ${ALERTS_RADIUS_KM} km. Viu algo na via? Avise os outros ciclistas.`
              }
              actions={
                <>
                  {activeCount > 0 ? (
                    <button type="button" onClick={clearFilters} className={mapSecondaryActionClass}>
                      Mostrar todos os tipos
                    </button>
                  ) : null}
                  <button type="button" onClick={openCreateModal} className={mapPrimaryActionClass}>
                    Criar alerta
                  </button>
                </>
              }
            />
          )
        }
      />

      <MapAlertsCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        submitting={createSubmitting}
      />

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="Filtrar alertas"
      >
        <CategoryFilters
          options={ALERT_FILTER_OPTIONS}
          value={typeFilters}
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
