"use client";

import { useEffect, useRef } from "react";
import { MAP_INITIAL_VIEW_CENTER } from "@/lib/geolocation";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

export interface RouteGeoJSON {
  type: "LineString";
  coordinates: [number, number][];
}

export interface RouteMapValue {
  geojson: RouteGeoJSON | null;
  coordinates: [number, number][];
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

function toRouteValue(layer: L.Polyline): RouteMapValue {
  const latLngs = layer.getLatLngs() as L.LatLng[];
  const coordinates: [number, number][] = latLngs.map((ll) => [ll.lat, ll.lng]);
  const geojson: RouteGeoJSON = {
    type: "LineString",
    coordinates: coordinates.map(([lat, lng]) => [lng, lat]),
  };
  return { geojson, coordinates };
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

function addStartEndMarkers(
  map: L.Map,
  L: typeof import("leaflet"),
  coordinates: [number, number][]
): L.LayerGroup {
  const group = L.layerGroup();
  if (coordinates.length < 2) return group;
  const startIcon = createPinIcon(L, "#1B5E20");
  const endIcon = createPinIcon(L, "#2E7D32");
  const start = L.marker([coordinates[0][0], coordinates[0][1]], {
    icon: startIcon,
    title: "Início",
  });
  const end = L.marker(
    [coordinates[coordinates.length - 1][0], coordinates[coordinates.length - 1][1]],
    { icon: endIcon, title: "Chegada" }
  );
  start.addTo(group);
  end.addTo(group);
  group.addTo(map);
  return group;
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
  onChangeRef.current = onChange;
  readOnlyRef.current = readOnly;
  staticDisplayRef.current = staticDisplay;
  valueRef.current = value;

  const mapCenter = center ?? MAP_INITIAL_VIEW_CENTER;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const L = require("leaflet");
    require("leaflet-draw");

    // Exige pelo menos 3 pontos para "clique no último ponto" finalizar a rota.
    // Em mobile, o toque que adiciona o ponto pode disparar no mesmo marcador e
    // finalizar a rota; atrasar a ativação do "clique para finalizar" evita isso.
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
    if (isReadOnly && initialValue.coordinates.length > 0) {
      const polyline = L.polyline(initialValue.coordinates, {
        color: "#1B5E20",
        weight: staticMode ? 3 : 4,
      });
      polyline.addTo(map);
      const markersGroup = addStartEndMarkers(map, L, initialValue.coordinates);
      if (initialValue.coordinates.length >= 2) {
        map.fitBounds(polyline.getBounds().pad(0.2));
      } else {
        const [lat, lng] = initialValue.coordinates[0];
        map.setView([lat, lng], 15);
      }
      return () => {
        restoreFinishHandler();
        if (markersGroup && map.hasLayer(markersGroup)) {
          map.removeLayer(markersGroup);
        }
        map.remove();
        mapRef.current = null;
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
      let markersGroup: L.LayerGroup | null = null;

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

      const updateStartEndMarkers = (coords: [number, number][]) => {
        if (markersGroup) {
          map.removeLayer(markersGroup);
          markersGroup = null;
        }
        if (coords.length >= 2) {
          markersGroup = addStartEndMarkers(map, L, coords);
        }
      };

      const onCreated = (e: L.LeafletEvent & { layer: L.Layer }) => {
        const layer = e.layer as L.Polyline;
        group.clearLayers();
        group.addLayer(layer);
        const routeVal = toRouteValue(layer);
        updateStartEndMarkers(routeVal.coordinates);
        onChangeRef.current(routeVal);
      };

      const onEdited = () => {
        const layers = group.getLayers();
        const polyline = layers[0] as L.Polyline | undefined;
        if (polyline) {
          const routeVal = toRouteValue(polyline);
          updateStartEndMarkers(routeVal.coordinates);
          onChangeRef.current(routeVal);
        }
      };

      const onDeleted = () => {
        if (markersGroup) {
          map.removeLayer(markersGroup);
          markersGroup = null;
        }
        onChangeRef.current({ geojson: null, coordinates: [] });
      };

      map.on(L.Draw.Event.CREATED, onCreated);
      map.on(L.Draw.Event.EDITED, onEdited);
      map.on(L.Draw.Event.DELETED, onDeleted);

      return () => {
        restoreFinishHandler();
        map.off(L.Draw.Event.CREATED, onCreated);
        map.off(L.Draw.Event.EDITED, onEdited);
        map.off(L.Draw.Event.DELETED, onDeleted);
        map.removeControl(drawControl);
        if (markersGroup) map.removeLayer(markersGroup);
        map.removeLayer(group);
        map.remove();
        mapRef.current = null;
      };
    }

    return () => {
      restoreFinishHandler();
      map.remove();
      mapRef.current = null;
    };
  }, [mapCenter[0], mapCenter[1], staticDisplay]);

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center]);

  const safeHeight = height || "400px";
  return (
    <>
      <style>{`
        .route-pin-icon.leaflet-div-icon { background: none !important; border: none !important; }
        .leaflet-draw-toolbar a { background-size: 270px 30px !important; }
      `}</style>
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
    </>
  );
}
