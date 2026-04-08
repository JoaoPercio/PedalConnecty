"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  LOCATION_PERMISSION_MESSAGE,
  requestUserPosition,
} from "@/lib/geolocation";
import {
  deleteMapAlert,
  formatTimeRemaining,
  insertMapAlert,
  loadMapAlertsForView,
  mapAlertTypeMeta,
  MAP_ALERT_CREATE_COOLDOWN_MS,
  MAP_ALERT_TYPE_OPTIONS,
  type MapAlertType,
  type MapAlertWithProfile,
} from "@/lib/map-alerts";
import { MapAlertsCreateModal } from "@/components/map/MapAlertsCreateModal";
import { AvatarImg } from "@/components/AvatarImg";

const ZOOM = 14;

function alertLatLng(a: MapAlertWithProfile): [number, number] {
  return [Number(a.lat), Number(a.lng)];
}

function profileDisplayName(p: MapAlertWithProfile["profile"]): string {
  if (!p) return "Ciclista";
  const n = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return n || "Ciclista";
}

function createAlertDivIcon(emoji: string): L.DivIcon {
  return L.divIcon({
    className: "map-alert-marker",
    html: `<div class="map-alert-marker-inner" aria-hidden="true">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -36],
  });
}

export function MapAlertsMap() {
  const { user } = useAuth();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [alerts, setAlerts] = useState<MapAlertWithProfile[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<MapAlertWithProfile | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [typeFilters, setTypeFilters] = useState<Record<MapAlertType, boolean>>(() =>
    Object.fromEntries(MAP_ALERT_TYPE_OPTIONS.map((o) => [o.value, true])) as Record<
      MapAlertType,
      boolean
    >
  );

  const lastCreateAtRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const effectLayerRef = useRef<L.LayerGroup | null>(null);

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

  const loadAlerts = useCallback(async () => {
    if (!userPos) return;
    setLoadingAlerts(true);
    setFetchError(null);
    const { data, error } = await loadMapAlertsForView(userPos[0], userPos[1], 30);
    if (error) {
      setFetchError("Não foi possível carregar os alertas.");
      setAlerts([]);
    } else {
      setAlerts(data);
    }
    setLoadingAlerts(false);
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

  const filteredAlerts = useMemo(
    () => alerts.filter((a) => typeFilters[a.type]),
    [alerts, typeFilters]
  );

  const visibleIds = useMemo(
    () => new Set(filteredAlerts.map((a) => a.id)),
    [filteredAlerts]
  );

  useEffect(() => {
    if (selectedAlert && !visibleIds.has(selectedAlert.id)) {
      setSelectedAlert(null);
    }
  }, [visibleIds, selectedAlert]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!userPos || !el) return;
    if (mapRef.current) return;

    const map = L.map(el, { scrollWheelZoom: true }).setView(userPos, ZOOM);
    mapRef.current = map;

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    const effectLayer = L.layerGroup().addTo(map);
    effectLayerRef.current = effectLayer;

    L.circleMarker(userPos, {
      radius: 9,
      color: "#1B5E20",
      fillColor: "#1B5E20",
      fillOpacity: 0.85,
      weight: 2,
    }).addTo(markersLayer);

    map.on("click", (e: L.LeafletMouseEvent) => {
      setSelectedAlert(null);
      const layer = effectLayerRef.current;
      if (!layer) return;
      const pulse = L.circle(e.latlng, {
        radius: 42,
        color: "#1B5E20",
        fillColor: "#43A047",
        fillOpacity: 0.22,
        weight: 2,
        interactive: false,
      });
      pulse.addTo(layer);
      window.setTimeout(() => {
        try {
          layer.removeLayer(pulse);
        } catch {
          /* map may be gone */
        }
      }, 480);
    });

    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      effectLayerRef.current = null;
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
    const layer = markersLayerRef.current;
    if (!map || !layer || !userPos) return;

    layer.clearLayers();

    L.circleMarker(userPos, {
      radius: 9,
      color: "#1B5E20",
      fillColor: "#1B5E20",
      fillOpacity: 0.85,
      weight: 2,
    }).addTo(layer);

    filteredAlerts.forEach((a) => {
      const { emoji } = mapAlertTypeMeta(a.type);
      const marker = L.marker(alertLatLng(a), {
        icon: createAlertDivIcon(emoji),
      });
      marker.addTo(layer);
      marker.on("click", (ev: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(ev);
        setSelectedAlert(a);
      });
    });
  }, [filteredAlerts, userPos]);

  const openCreateModal = () => {
    if (!user) {
      toast.error("Faça login para criar alertas.");
      return;
    }
    if (!userPos) {
      toast.error("Precisamos da sua localização para criar um alerta.");
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

  const handleDeleteSelected = async () => {
    if (!selectedAlert || !user || selectedAlert.user_id !== user.id) return;
    const { error } = await deleteMapAlert(selectedAlert.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Alerta removido");
    setSelectedAlert(null);
    await loadAlerts();
  };

  const toggleTypeFilter = (t: MapAlertType) => {
    setTypeFilters((prev) => ({ ...prev, [t]: !prev[t] }));
  };

  const allTypesOn = MAP_ALERT_TYPE_OPTIONS.every((o) => typeFilters[o.value]);

  if (loadingLocation) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!userPos) {
    if (locationDenied) {
      return (
        <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 bg-surface px-6 text-center">
          <p className="max-w-md text-sm text-foreground">{LOCATION_PERMISSION_MESSAGE}</p>
        </div>
      );
    }
    return null;
  }

  const meta = selectedAlert ? mapAlertTypeMeta(selectedAlert.type) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap gap-2 border-b border-gray-100 bg-surface px-3 py-2">
        <button
          type="button"
          onClick={() =>
            setTypeFilters(
              Object.fromEntries(MAP_ALERT_TYPE_OPTIONS.map((o) => [o.value, true])) as Record<
                MapAlertType,
                boolean
              >
            )
          }
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            allTypesOn
              ? "bg-primary text-white"
              : "bg-background text-text-secondary ring-1 ring-gray-200"
          }`}
        >
          Todos
        </button>
        {MAP_ALERT_TYPE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => toggleTypeFilter(o.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              typeFilters[o.value]
                ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                : "bg-background text-text-secondary opacity-60 ring-1 ring-gray-200"
            }`}
          >
            {o.emoji} {o.label}
          </button>
        ))}
      </div>

      {fetchError && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2">
          <p className="text-center text-xs text-red-700">{fetchError}</p>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {loadingAlerts && alerts.length === 0 && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-surface/80 backdrop-blur-[1px]">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        <div
          ref={containerRef}
          className="h-full min-h-[280px] w-full touch-manipulation"
        />

        {loadingAlerts && alerts.length > 0 && (
          <div className="pointer-events-none absolute right-3 top-3 z-[500] flex items-center gap-2 rounded-full border border-gray-200/80 bg-surface/95 px-3 py-1.5 shadow-md backdrop-blur-sm">
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden
            />
            <span className="text-xs font-medium text-text-secondary">Atualizando…</span>
          </div>
        )}

        <button
          type="button"
          onClick={openCreateModal}
          className="absolute bottom-4 right-4 z-[600] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-light text-white shadow-lg ring-2 ring-white/90 transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Criar alerta"
        >
          +
        </button>
      </div>

      {selectedAlert && meta && (
        <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-[1100] flex justify-center px-4 pb-safe">
          <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-gray-200 bg-surface p-4 shadow-xl">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl">
                {meta.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{meta.label}</p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {profileDisplayName(selectedAlert.profile)}
                </p>
                {selectedAlert.description ? (
                  <p className="mt-2 text-sm text-foreground">{selectedAlert.description}</p>
                ) : (
                  <p className="mt-2 text-sm italic text-text-secondary">Sem descrição</p>
                )}
                <p className="mt-2 text-xs font-medium text-primary">
                  {formatTimeRemaining(selectedAlert.expires_at)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="rounded-lg p-1 text-text-secondary hover:bg-gray-100 hover:text-foreground"
                  aria-label="Fechar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
                {selectedAlert.profile?.avatar_url ? (
                  <AvatarImg
                    src={selectedAlert.profile.avatar_url}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-gray-200"
                  />
                ) : null}
              </div>
            </div>
            {user && selectedAlert.user_id === user.id ? (
              <button
                type="button"
                onClick={() => void handleDeleteSelected()}
                className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                Excluir meu alerta
              </button>
            ) : null}
          </div>
        </div>
      )}

      <MapAlertsCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        submitting={createSubmitting}
      />

      <style>{`
        .map-alert-marker.leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .map-alert-marker-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          font-size: 26px;
          line-height: 1;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
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
    </div>
  );
}
