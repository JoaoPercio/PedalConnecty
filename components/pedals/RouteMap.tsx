"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MAP_INITIAL_VIEW_CENTER } from "@/lib/geolocation";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

export interface RouteGeoJSON {
  type: "LineString";
  coordinates: [number, number][];
}

export interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RouteMapValue {
  geojson: RouteGeoJSON | null;
  coordinates: [number, number][];
  waypoints: RouteWaypoint[];
}

interface RouteMapProps {
  value: RouteMapValue;
  onChange: (value: RouteMapValue) => void;
  height?: string;
  readOnly?: boolean;
  /** Com `readOnly`: tiles + rota como imagem fixa (sem pan/zoom). */
  staticDisplay?: boolean;
  center?: [number, number];
  containerClassName?: string;
}

const START_PIN_COLOR = "#1565C0";
const END_PIN_COLOR = "#C62828";

function toRouteValue(
  layer: L.Polyline,
  existingWaypoints: RouteWaypoint[]
): RouteMapValue {
  const latLngs = layer.getLatLngs() as L.LatLng[];
  const coordinates: [number, number][] = latLngs.map((ll) => [ll.lat, ll.lng]);
  const geojson: RouteGeoJSON = {
    type: "LineString",
    coordinates: coordinates.map(([lat, lng]) => [lng, lat]),
  };
  return { geojson, coordinates, waypoints: existingWaypoints };
}

function createPinIcon(L: typeof import("leaflet"), color: string): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="36"><path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0zm0 17c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z"/></svg>`;
  return L.divIcon({
    html: svg,
    className: "route-pin-icon",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  });
}

/** Marcador em losango para paradas (posto, café, etc.) */
function createStopIcon(L: typeof import("leaflet")): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="26" height="26"><path fill="#F9A825" stroke="#fff" stroke-width="1.5" d="M14 2l10 12-10 12L4 14z"/></svg>`;
  return L.divIcon({
    html: svg,
    className: "route-pin-icon route-stop-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function addStartEndMarkers(
  map: L.Map,
  L: typeof import("leaflet"),
  coordinates: [number, number][]
): L.LayerGroup {
  const group = L.layerGroup();
  if (coordinates.length < 2) return group;
  const startIcon = createPinIcon(L, START_PIN_COLOR);
  const endIcon = createPinIcon(L, END_PIN_COLOR);
  const start = L.marker([coordinates[0][0], coordinates[0][1]], {
    icon: startIcon,
    title: "Início",
  });
  const end = L.marker(
    [coordinates[coordinates.length - 1][0], coordinates[coordinates.length - 1][1]],
    { icon: endIcon, title: "Chegada" }
  );
  start.bindPopup("<strong>Início</strong>");
  end.bindPopup("<strong>Chegada</strong>");
  start.addTo(group);
  end.addTo(group);
  group.addTo(map);
  return group;
}

function fillWaypointLayer(
  L: typeof import("leaflet"),
  layer: L.LayerGroup,
  waypoints: RouteWaypoint[],
  options: { draggable: boolean; onMove?: (id: string, lat: number, lng: number) => void }
) {
  layer.clearLayers();
  const icon = createStopIcon(L);
  for (const wp of waypoints) {
    const m = L.marker([wp.lat, wp.lng], {
      icon,
      draggable: options.draggable,
      title: wp.name,
    });
    m.bindPopup(wp.name.trim() || "Parada");
    if (options.draggable && options.onMove) {
      const onMove = options.onMove;
      const id = wp.id;
      m.on("dragend", () => {
        const ll = m.getLatLng();
        onMove(id, ll.lat, ll.lng);
      });
    }
    m.addTo(layer);
  }
}

export function RouteMap({
  value,
  onChange,
  height = "400px",
  readOnly = false,
  staticDisplay = false,
  center,
  containerClassName = "",
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onChangeRef = useRef(onChange);
  const readOnlyRef = useRef(readOnly);
  const staticDisplayRef = useRef(staticDisplay);
  const valueRef = useRef(value);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const startEndLayerRef = useRef<L.LayerGroup | null>(null);
  const waypointsLayerRef = useRef<L.LayerGroup | null>(null);
  const refreshWaypointsRef = useRef<() => void>(() => {});
  const refreshStartEndRef = useRef<(coords: [number, number][]) => void>(() => {});

  const [placementMode, setPlacementMode] = useState(false);
  const listId = useId();

  onChangeRef.current = onChange;
  readOnlyRef.current = readOnly;
  staticDisplayRef.current = staticDisplay;
  valueRef.current = value;

  const mapCenter = center ?? MAP_INITIAL_VIEW_CENTER;

  const pushWaypoint = useCallback((lat: number, lng: number) => {
    const prev = valueRef.current;
    const n = prev.waypoints.length + 1;
    const wp: RouteWaypoint = {
      id: globalThis.crypto?.randomUUID?.() ?? `wp-${Date.now()}-${n}`,
      name: `Parada ${n}`,
      lat,
      lng,
    };
    onChangeRef.current({
      ...prev,
      waypoints: [...prev.waypoints, wp],
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const L = require("leaflet");
    require("leaflet-draw");
    leafletRef.current = L;

    const originalUpdateFinishHandler =
      L.Draw.Polyline.prototype._updateFinishHandler;
    const FINISH_HANDLER_DELAY_MS = 200;
    L.Draw.Polyline.prototype._updateFinishHandler = function () {
      const self = this;
      if (self._finishHandlerTimeout) {
        clearTimeout(self._finishHandlerTimeout);
        self._finishHandlerTimeout = null;
      }
      const markerCount = self._markers.length;
      if (markerCount > 3) {
        self._markers[markerCount - 2].off("click", self._finishShape, self);
      }
      if (markerCount > 2) {
        const lastMarker = self._markers[markerCount - 1];
        self._finishHandlerTimeout = setTimeout(function () {
          self._finishHandlerTimeout = null;
          lastMarker.on("click", self._finishShape, self);
        }, FINISH_HANDLER_DELAY_MS);
      }
    };

    const restoreFinishHandler = () => {
      L.Draw.Polyline.prototype._updateFinishHandler =
        originalUpdateFinishHandler;
    };

    if (mapRef.current) return;

    const isReadOnlyInit = readOnlyRef.current;
    const staticMode = isReadOnlyInit && staticDisplayRef.current;

    const map = L.map(container, {
      tapTolerance: 40,
      touchZoom: !staticMode,
      dragging: !staticMode,
      scrollWheelZoom: !staticMode,
      doubleClickZoom: !staticMode,
      boxZoom: !staticMode,
      keyboard: !staticMode,
      zoomControl: !staticMode,
      bounceAtZoomLimits: false,
    }).setView(mapCenter, 13);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const isReadOnly = readOnlyRef.current;
    const initialValue = valueRef.current;

    const syncStartEnd = (coords: [number, number][]) => {
      if (startEndLayerRef.current && map.hasLayer(startEndLayerRef.current)) {
        map.removeLayer(startEndLayerRef.current);
        startEndLayerRef.current = null;
      }
      if (coords.length >= 2) {
        startEndLayerRef.current = addStartEndMarkers(map, L, coords);
      }
    };
    refreshStartEndRef.current = syncStartEnd;

    const syncWaypoints = () => {
      const wps = valueRef.current.waypoints;
      const layer =
        waypointsLayerRef.current ?? L.layerGroup().addTo(map);
      waypointsLayerRef.current = layer;
      if (isReadOnly) {
        fillWaypointLayer(L, layer, wps, { draggable: false });
        return;
      }
      fillWaypointLayer(L, layer, wps, {
        draggable: true,
        onMove: (id, lat, lng) => {
          const v = valueRef.current;
          const next = v.waypoints.map((w) =>
            w.id === id ? { ...w, lat, lng } : w
          );
          onChangeRef.current({ ...v, waypoints: next });
        },
      });
    };
    refreshWaypointsRef.current = syncWaypoints;

    if (isReadOnly && initialValue.coordinates.length > 0) {
      const polyline = L.polyline(initialValue.coordinates, {
        color: "#1B5E20",
        weight: staticMode ? 3 : 4,
      });
      polyline.addTo(map);
      syncStartEnd(initialValue.coordinates);
      syncWaypoints();
      if (initialValue.coordinates.length >= 2) {
        const b = polyline.getBounds().pad(0.2);
        for (const w of initialValue.waypoints) {
          b.extend([w.lat, w.lng]);
        }
        map.fitBounds(b);
      } else {
        const [lat, lng] = initialValue.coordinates[0];
        map.setView([lat, lng], 15);
      }
      return () => {
        restoreFinishHandler();
        if (startEndLayerRef.current && map.hasLayer(startEndLayerRef.current)) {
          map.removeLayer(startEndLayerRef.current);
        }
        if (waypointsLayerRef.current && map.hasLayer(waypointsLayerRef.current)) {
          map.removeLayer(waypointsLayerRef.current);
        }
        startEndLayerRef.current = null;
        waypointsLayerRef.current = null;
        map.remove();
        mapRef.current = null;
        leafletRef.current = null;
      };
    }

    if (!isReadOnly) {
      L.drawLocal = L.drawLocal || {};
      L.drawLocal.draw = L.drawLocal.draw || {};
      L.drawLocal.draw.handlers = L.drawLocal.draw.handlers || {};
      L.drawLocal.draw.handlers.polyline = {
        ...L.drawLocal.draw.handlers.polyline,
        tooltip: {
          start: "Toque rápido ou clique para o 1º ponto. Arraste para mover o mapa.",
          cont: "Toque rápido ou clique para mais pontos. Arraste para reposicionar o mapa.",
          end: "Toque de novo no último ponto ou use Finalizar.",
        },
      };
      L.drawLocal.draw.toolbar = L.drawLocal.draw.toolbar || {};
      L.drawLocal.draw.toolbar.buttons = L.drawLocal.draw.toolbar.buttons || {};
      L.drawLocal.draw.toolbar.buttons.polyline = "Desenhar rota";
      L.drawLocal.draw.toolbar.actions = L.drawLocal.draw.toolbar.actions || {};
      L.drawLocal.draw.toolbar.actions.finish = {
        title: "Finalizar desenho",
        text: "Finalizar",
      };
      L.drawLocal.draw.toolbar.actions.undo = {
        title: "Remover último ponto",
        text: "Desfazer",
      };
      L.drawLocal.draw.toolbar.actions.cancel = {
        title: "Cancelar desenho",
        text: "Cancelar",
      };

      const group = new L.FeatureGroup();
      map.addLayer(group);

      if (initialValue.geojson && initialValue.coordinates.length >= 2) {
        const existing = L.polyline(initialValue.coordinates, {
          color: "#1B5E20",
          weight: 4,
        });
        group.addLayer(existing);
      }

      waypointsLayerRef.current = L.layerGroup().addTo(map);
      syncStartEnd(initialValue.coordinates);
      syncWaypoints();

      const drawOptions: L.Control.DrawConstructorOptions = {
        position: "topright",
        draw: {
          polyline: {
            shapeOptions: { color: "#1B5E20", weight: 4 },
            metric: true,
            maxPoints: 0,
            repeatMode: true,
          },
          polygon: false,
          circle: false,
          rectangle: false,
          marker: false,
          circlemarker: false,
        },
        edit: {
          featureGroup: group,
          remove: true,
        },
      };

      const drawControl = new L.Control.Draw(drawOptions);
      map.addControl(drawControl);

      const onCreated = (e: L.LeafletEvent & { layer: L.Layer }) => {
        const layer = e.layer as L.Polyline;
        group.clearLayers();
        group.addLayer(layer);
        const routeVal = toRouteValue(layer, valueRef.current.waypoints);
        syncStartEnd(routeVal.coordinates);
        syncWaypoints();
        onChangeRef.current(routeVal);
      };

      const onEdited = () => {
        const layers = group.getLayers();
        const polyline = layers[0] as L.Polyline | undefined;
        if (polyline) {
          const routeVal = toRouteValue(polyline, valueRef.current.waypoints);
          syncStartEnd(routeVal.coordinates);
          syncWaypoints();
          onChangeRef.current(routeVal);
        }
      };

      const onDeleted = () => {
        syncStartEnd([]);
        if (waypointsLayerRef.current) {
          waypointsLayerRef.current.clearLayers();
        }
        onChangeRef.current({ geojson: null, coordinates: [], waypoints: [] });
      };

      map.on(L.Draw.Event.CREATED, onCreated);
      map.on(L.Draw.Event.EDITED, onEdited);
      map.on(L.Draw.Event.DELETED, onDeleted);

      if (initialValue.coordinates.length >= 2) {
        const layers = group.getLayers();
        const pl = layers[0] as L.Polyline | undefined;
        if (pl) {
          map.fitBounds(pl.getBounds().pad(0.2));
        }
      }

      return () => {
        restoreFinishHandler();
        map.off(L.Draw.Event.CREATED, onCreated);
        map.off(L.Draw.Event.EDITED, onEdited);
        map.off(L.Draw.Event.DELETED, onDeleted);
        map.removeControl(drawControl);
        if (startEndLayerRef.current && map.hasLayer(startEndLayerRef.current)) {
          map.removeLayer(startEndLayerRef.current);
        }
        if (waypointsLayerRef.current && map.hasLayer(waypointsLayerRef.current)) {
          map.removeLayer(waypointsLayerRef.current);
        }
        startEndLayerRef.current = null;
        waypointsLayerRef.current = null;
        map.removeLayer(group);
        map.remove();
        mapRef.current = null;
        leafletRef.current = null;
      };
    }

    return () => {
      restoreFinishHandler();
      map.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [mapCenter[0], mapCenter[1], staticDisplay]);

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center]);

  useEffect(() => {
    refreshWaypointsRef.current();
  }, [value.waypoints]);

  useEffect(() => {
    if (readOnly || !mapRef.current) return;
    const map = mapRef.current;

    if (!placementMode) return;

    const onMapClick = (e: { latlng: { lat: number; lng: number } }) => {
      pushWaypoint(e.latlng.lat, e.latlng.lng);
    };

    map.on("click", onMapClick);
    return () => {
      map.off("click", onMapClick);
    };
  }, [placementMode, pushWaypoint, readOnly]);

  const canEditWaypoints = !readOnly && value.coordinates.length >= 2;

  const removeWaypoint = (id: string) => {
    onChange({
      ...value,
      waypoints: value.waypoints.filter((w) => w.id !== id),
    });
  };

  const renameWaypoint = (id: string, name: string) => {
    onChange({
      ...value,
      waypoints: value.waypoints.map((w) =>
        w.id === id ? { ...w, name } : w
      ),
    });
  };

  const safeHeight = height || "400px";
  return (
    <div className="space-y-3">
      <style>{`
        .route-pin-icon.leaflet-div-icon { background: none !important; border: none !important; }
        .leaflet-draw-toolbar a { background-size: 270px 30px !important; }
      `}</style>
      {readOnly && value.coordinates.length >= 2 ? (
        <p className="text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: START_PIN_COLOR }} /> Início
          </span>
          {" · "}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: END_PIN_COLOR }} /> Chegada
          </span>
          {" · "}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rotate-45 bg-[#F9A825]" /> Parada
          </span>
        </p>
      ) : null}
      <div
        ref={containerRef}
        className={`overflow-hidden rounded-xl border border-gray-200 bg-surface touch-manipulation select-none ${containerClassName}`.trim()}
        style={{
          height: safeHeight,
          touchAction: "manipulation",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      />
      {canEditWaypoints ? (
        <div className="rounded-xl border border-gray-100 bg-surface p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPlacementMode((p) => !p)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                placementMode
                  ? "bg-primary text-white"
                  : "border border-gray-200 bg-surface text-foreground hover:bg-gray-50"
              }`}
            >
              {placementMode ? "Cancelar parada" : "Adicionar parada no mapa"}
            </button>
            {placementMode ? (
              <span className="text-text-secondary">
                Toque no mapa onde fica a parada (ex.: posto).
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            Arraste o losango âmbar no mapa para ajustar a posição. Azul = início, vermelho = chegada.
          </p>
          {value.waypoints.length > 0 ? (
            <ul className="mt-3 space-y-2" aria-label="Pontos de parada">
              {value.waypoints.map((wp, idx) => (
                <li
                  key={wp.id}
                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2"
                >
                  <label className="sr-only" htmlFor={`${listId}-wp-${idx}`}>
                    Nome da parada {idx + 1}
                  </label>
                  <input
                    id={`${listId}-wp-${idx}`}
                    type="text"
                    value={wp.name}
                    onChange={(e) => renameWaypoint(wp.id, e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-foreground"
                    placeholder="Nome da parada"
                    maxLength={120}
                  />
                  <button
                    type="button"
                    onClick={() => removeWaypoint(wp.id)}
                    className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
