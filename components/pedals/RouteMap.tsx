"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MAP_INITIAL_VIEW_CENTER } from "@/lib/geolocation";
import { calculateDistanceKm } from "@/lib/pedals";
import {
  appendAnchor,
  applySegmentResult,
  editorCoordinates,
  editorFromCoordinates,
  moveAnchor,
  removeAnchor,
  removeLastAnchor,
  type RouteDrawStyle,
  type RouteEditorState,
  type RouteSegment,
} from "@/lib/route-editor";
import { snapRouteSegment, type RouteSnapFailure } from "@/lib/route-snap";
import { addBaseTileLayer } from "@/lib/map-tiles";

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
  /**
   * Pontos tocados e trechos (só na sessão de edição; não vai para o banco).
   * Sem ele, o editor reconstrói a partir de `coordinates`.
   */
  editor?: RouteEditorState;
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
  /** Só em `readOnly`: título e popup do pin do primeiro ponto (default: ponto de encontro / início da rota). */
  startMarkerLabel?: string;
}

type MapTool = "move" | "draw" | "stop";

const START_PIN_COLOR = "#2E7D32";
const END_PIN_COLOR = "#C62828";
const ROUTE_COLOR = "#1B5E20";
const PENDING_COLOR = "#757575";
const FALLBACK_COLOR = "#EF6C00";

/** Toque que se move mais que isso (px) é arrasto, não toque. */
const TAP_MAX_MOVE_PX = 10;
/** Toque mais longo que isso (ms) não cria ponto. */
const TAP_MAX_DURATION_MS = 500;
/** Ignora toques logo após um zoom (pinça ou botões). */
const TAP_IGNORE_AFTER_ZOOM_MS = 400;

const DRAW_STYLES: { value: RouteDrawStyle; label: string; hint: string }[] = [
  { value: "cycling", label: "🚲 Ciclovias e ruas", hint: "Prefere ciclovias e ciclofaixas" },
  { value: "mtb", label: "⛰️ Trilha / MTB", hint: "Aceita terra, trilhas e caminhos" },
  { value: "free", label: "✏️ Linha livre", hint: "Liga os pontos em linha reta" },
];

const ROUTING_ISSUE_MESSAGES: Record<RouteSnapFailure | "no_route", string> = {
  not_configured:
    "O traçado automático não está disponível no momento. Os trechos ficaram em linha reta.",
  rate_limited:
    "Muitas solicitações em pouco tempo. Aguarde alguns segundos e toque em “Tentar de novo”.",
  offline:
    "Sem conexão: o trecho ficou em linha reta. Toque em “Tentar de novo” quando a internet voltar.",
  failed:
    "Não foi possível calcular o trajeto. O trecho ficou em linha reta (laranja).",
  no_route:
    "Não achamos uma via pedalável perto desse ponto. O trecho ficou em linha reta (laranja) — toque mais perto de uma rua, ciclovia ou trilha, ou use “Linha livre”.",
};

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

/** Ponto editável da rota: círculo pequeno com área de toque de 40px. */
function createAnchorIcon(
  L: typeof import("leaflet"),
  kind: "start" | "end" | "mid",
  selected: boolean
): L.DivIcon {
  return L.divIcon({
    html: `<span class="route-anchor route-anchor--${kind}${selected ? " route-anchor--selected" : ""}"></span>`,
    className: "route-anchor-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function addStartEndMarkers(
  map: L.Map,
  L: typeof import("leaflet"),
  coordinates: [number, number][],
  startLabel: string
): L.LayerGroup {
  const group = L.layerGroup();
  if (coordinates.length < 2) return group;
  const startIcon = createPinIcon(L, START_PIN_COLOR);
  const endIcon = createPinIcon(L, END_PIN_COLOR);
  const startEscaped = startLabel.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const start = L.marker([coordinates[0][0], coordinates[0][1]], {
    icon: startIcon,
    title: startLabel,
  });
  const end = L.marker(
    [coordinates[coordinates.length - 1][0], coordinates[coordinates.length - 1][1]],
    { icon: endIcon, title: "Chegada" }
  );
  start.bindPopup(`<strong>${startEscaped}</strong>`);
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
  options: {
    draggable: boolean;
    onMove?: (id: string, lat: number, lng: number) => void;
    onDragStart?: () => void;
  }
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
      if (options.onDragStart) m.on("dragstart", options.onDragStart);
      m.on("dragend", () => {
        const ll = m.getLatLng();
        onMove(id, ll.lat, ll.lng);
      });
    }
    m.addTo(layer);
  }
}

function segmentStyle(seg: RouteSegment): L.PolylineOptions {
  switch (seg.status) {
    case "routed":
      return { color: ROUTE_COLOR, weight: 5, opacity: 0.95 };
    case "straight":
      return { color: ROUTE_COLOR, weight: 4, opacity: 0.85 };
    case "pending":
      return { color: PENDING_COLOR, weight: 4, opacity: 0.8, dashArray: "6 8" };
    case "fallback":
      return { color: FALLBACK_COLOR, weight: 4, opacity: 0.95, dashArray: "8 6" };
  }
}

function formatKm(km: number): string {
  return km.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function buildValue(
  prev: RouteMapValue,
  editor: RouteEditorState,
  waypoints: RouteWaypoint[] = prev.waypoints
): RouteMapValue {
  const coordinates = editorCoordinates(editor);
  return {
    editor,
    coordinates,
    geojson:
      coordinates.length >= 2
        ? { type: "LineString", coordinates: coordinates.map(([lat, lng]) => [lng, lat]) }
        : null,
    waypoints,
  };
}

const DEFAULT_READ_ONLY_START_LABEL = "Ponto de encontro / início da rota";

export function RouteMap({
  value,
  onChange,
  height = "400px",
  readOnly = false,
  staticDisplay = false,
  center,
  containerClassName = "",
  startMarkerLabel,
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
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const anchorsLayerRef = useRef<L.LayerGroup | null>(null);
  const refreshStartEndRef = useRef<(coords: [number, number][]) => void>(() => {});
  const startMarkerLabelRef = useRef<string | undefined>(undefined);
  startMarkerLabelRef.current = startMarkerLabel;

  /** Arraste de marcador em andamento: adia o redesenho para não interrompê-lo. */
  const draggingRef = useRef(false);
  const redrawRef = useRef<() => void>(() => {});
  const mapTapRef = useRef<(lat: number, lng: number) => void>(() => {});
  const lastZoomAtRef = useRef(0);
  const lastTapRef = useRef({ valid: false, at: 0 });

  const [mapReady, setMapReady] = useState(false);
  const [tool, setTool] = useState<MapTool>("move");
  const [drawStyle, setDrawStyle] = useState<RouteDrawStyle>("cycling");
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
  const [routingIssue, setRoutingIssue] = useState<RouteSnapFailure | "no_route" | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const listId = useId();

  onChangeRef.current = onChange;
  readOnlyRef.current = readOnly;
  staticDisplayRef.current = staticDisplay;
  valueRef.current = value;

  const mapCenter = center ?? MAP_INITIAL_VIEW_CENTER;

  const editor = useMemo(
    () => value.editor ?? editorFromCoordinates(value.coordinates),
    [value.editor, value.coordinates]
  );

  const currentEditor = useCallback((): RouteEditorState => {
    const v = valueRef.current;
    return v.editor ?? editorFromCoordinates(v.coordinates);
  }, []);

  /** Atualiza o valor já no ref, para respostas assíncronas não se sobrescreverem. */
  const commit = useCallback((next: RouteMapValue) => {
    valueRef.current = next;
    onChangeRef.current(next);
  }, []);

  const routeSegments = useCallback(
    (segments: RouteSegment[]) => {
      for (const seg of segments) {
        if (seg.style === "free") continue;
        const from = seg.coords[0];
        const to = seg.coords[seg.coords.length - 1];
        void snapRouteSegment(seg.style, from, to).then((res) => {
          const applied = applySegmentResult(
            currentEditor(),
            seg.id,
            res.ok ? res.coordinates : null
          );
          if (!applied) return;
          if (res.ok) {
            setRoutingIssue(null);
          } else {
            setRoutingIssue(res.reason === "failed" ? "no_route" : res.reason);
          }
          commit(buildValue(valueRef.current, applied));
        });
      }
    },
    [commit, currentEditor]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;
    if (mapRef.current) return;

    const L = require("leaflet") as typeof import("leaflet");
    leafletRef.current = L;

    const isReadOnly = readOnlyRef.current;
    const staticMode = isReadOnly && staticDisplayRef.current;
    const initialValue = valueRef.current;

    const map = L.map(container, {
      touchZoom: !staticMode,
      dragging: !staticMode,
      scrollWheelZoom: !staticMode,
      // Na edição, o duplo toque criaria dois pontos; zoom fica na pinça/botões.
      doubleClickZoom: isReadOnly && !staticMode,
      boxZoom: !staticMode,
      keyboard: !staticMode,
      zoomControl: false,
      bounceAtZoomLimits: false,
    }).setView(mapCenter, 13);
    mapRef.current = map;
    if (!staticMode) {
      L.control.zoom({ position: "topright", zoomInTitle: "Aproximar", zoomOutTitle: "Afastar" }).addTo(map);
    }

    addBaseTileLayer(L, map);

    const syncStartEnd = (coords: [number, number][]) => {
      if (startEndLayerRef.current && map.hasLayer(startEndLayerRef.current)) {
        map.removeLayer(startEndLayerRef.current);
        startEndLayerRef.current = null;
      }
      if (coords.length >= 2) {
        const startLabel =
          startMarkerLabelRef.current ?? DEFAULT_READ_ONLY_START_LABEL;
        startEndLayerRef.current = addStartEndMarkers(map, L, coords, startLabel);
      }
    };
    refreshStartEndRef.current = syncStartEnd;

    const cleanup = () => {
      if (startEndLayerRef.current && map.hasLayer(startEndLayerRef.current)) {
        map.removeLayer(startEndLayerRef.current);
      }
      startEndLayerRef.current = null;
      waypointsLayerRef.current = null;
      routeLayerRef.current = null;
      anchorsLayerRef.current = null;
      map.remove();
      mapRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };

    if (isReadOnly) {
      waypointsLayerRef.current = L.layerGroup().addTo(map);
      if (initialValue.coordinates.length > 0) {
        const polyline = L.polyline(initialValue.coordinates, {
          color: ROUTE_COLOR,
          weight: staticMode ? 3 : 4,
        });
        polyline.addTo(map);
        syncStartEnd(initialValue.coordinates);
        fillWaypointLayer(L, waypointsLayerRef.current, initialValue.waypoints, {
          draggable: false,
        });
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
      }
      return cleanup;
    }

    routeLayerRef.current = L.layerGroup().addTo(map);
    waypointsLayerRef.current = L.layerGroup().addTo(map);
    anchorsLayerRef.current = L.layerGroup().addTo(map);

    if (initialValue.coordinates.length >= 2) {
      const b = L.latLngBounds(initialValue.coordinates).pad(0.2);
      for (const w of initialValue.waypoints) b.extend([w.lat, w.lng]);
      map.fitBounds(b);
    } else if (initialValue.coordinates.length === 1) {
      map.setView(initialValue.coordinates[0], 15);
    }

    // Filtro de gestos: só um toque curto, parado e com um dedo vira ponto.
    // Arrastar o mapa, pinça de zoom e toque longo nunca criam pontos.
    const gesture = {
      pointers: new Map<number, { x: number; y: number }>(),
      multi: false,
      moved: false,
      startAt: 0,
    };
    const onPointerDown = (e: PointerEvent) => {
      if (gesture.pointers.size === 0) {
        gesture.multi = false;
        gesture.moved = false;
        gesture.startAt = Date.now();
      }
      gesture.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (gesture.pointers.size > 1) gesture.multi = true;
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = gesture.pointers.get(e.pointerId);
      if (!p) return;
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > TAP_MAX_MOVE_PX) {
        gesture.moved = true;
      }
    };
    const onPointerEnd = (e: PointerEvent) => {
      if (!gesture.pointers.has(e.pointerId)) return;
      if (e.type === "pointercancel") gesture.moved = true;
      gesture.pointers.delete(e.pointerId);
      if (gesture.pointers.size === 0) {
        const now = Date.now();
        lastTapRef.current = {
          valid:
            !gesture.multi &&
            !gesture.moved &&
            now - gesture.startAt <= TAP_MAX_DURATION_MS,
          at: now,
        };
      }
    };
    const hasPointerEvents = "PointerEvent" in window;
    if (hasPointerEvents) {
      container.addEventListener("pointerdown", onPointerDown, true);
      container.addEventListener("pointermove", onPointerMove, true);
      container.addEventListener("pointerup", onPointerEnd, true);
      container.addEventListener("pointercancel", onPointerEnd, true);
    }

    const onZoom = () => {
      lastZoomAtRef.current = Date.now();
    };
    const onMapClick = (e: L.LeafletMouseEvent) => {
      const now = Date.now();
      if (now - lastZoomAtRef.current < TAP_IGNORE_AFTER_ZOOM_MS) return;
      if (hasPointerEvents) {
        const tap = lastTapRef.current;
        if (!tap.valid || now - tap.at > 700) return;
      }
      mapTapRef.current(e.latlng.lat, e.latlng.lng);
    };
    map.on("zoomstart zoomend", onZoom);
    map.on("click", onMapClick);
    setMapReady(true);

    return () => {
      map.off("zoomstart zoomend", onZoom);
      map.off("click", onMapClick);
      if (hasPointerEvents) {
        container.removeEventListener("pointerdown", onPointerDown, true);
        container.removeEventListener("pointermove", onPointerMove, true);
        container.removeEventListener("pointerup", onPointerEnd, true);
        container.removeEventListener("pointercancel", onPointerEnd, true);
      }
      cleanup();
    };
    // Na edição o mapa é criado uma vez; `center` é tratado no efeito abaixo.
  }, [readOnly ? mapCenter[0] : 0, readOnly ? mapCenter[1] : 0, staticDisplay, readOnly]);

  useEffect(() => {
    if (!readOnly) return;
    refreshStartEndRef.current(value.coordinates);
  }, [readOnly, value.coordinates, startMarkerLabel]);

  // Centraliza na localização do usuário só enquanto não há rota desenhada.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    if (!readOnly && currentEditor().anchors.length > 0) return;
    map.setView(center, map.getZoom());
  }, [center, readOnly, currentEditor]);

  // Redesenha trechos, pontos e paradas a partir do estado.
  useEffect(() => {
    if (readOnly || !mapReady) return;
    const L = leafletRef.current;
    const routeLayer = routeLayerRef.current;
    const anchorsLayer = anchorsLayerRef.current;
    const waypointsLayer = waypointsLayerRef.current;
    if (!L || !routeLayer || !anchorsLayer || !waypointsLayer) return;

    const redraw = () => {
      routeLayer.clearLayers();
      anchorsLayer.clearLayers();

      for (const seg of editor.segments) {
        L.polyline(seg.coords, { ...segmentStyle(seg), interactive: false }).addTo(routeLayer);
      }

      const lastIdx = editor.anchors.length - 1;
      editor.anchors.forEach((a, i) => {
        const kind = i === 0 ? "start" : i === lastIdx ? "end" : "mid";
        const marker = L.marker([a.lat, a.lng], {
          icon: createAnchorIcon(L, kind, a.id === selectedAnchorId),
          draggable: true,
          autoPan: true,
          title: kind === "start" ? "Início" : kind === "end" ? "Chegada" : `Ponto ${i + 1}`,
          zIndexOffset: kind === "mid" ? 0 : 500,
        });
        marker.on("click", () => {
          setSelectedAnchorId((cur) => (cur === a.id ? null : a.id));
        });
        marker.on("dragstart", () => {
          draggingRef.current = true;
        });
        marker.on("dragend", () => {
          draggingRef.current = false;
          const p = marker.getLatLng();
          const change = moveAnchor(currentEditor(), a.id, p.lat, p.lng);
          commit(buildValue(valueRef.current, change.editor));
          routeSegments(change.toRoute);
        });
        marker.addTo(anchorsLayer);
      });

      fillWaypointLayer(L, waypointsLayer, value.waypoints, {
        draggable: true,
        onDragStart: () => {
          draggingRef.current = true;
        },
        onMove: (id, lat, lng) => {
          draggingRef.current = false;
          const v = valueRef.current;
          commit({
            ...v,
            waypoints: v.waypoints.map((w) => (w.id === id ? { ...w, lat, lng } : w)),
          });
        },
      });
    };
    redrawRef.current = redraw;
    // Se uma resposta do roteamento chegar no meio de um arraste, espera ele terminar.
    if (draggingRef.current) {
      const t = setInterval(() => {
        if (!draggingRef.current) {
          clearInterval(t);
          redrawRef.current();
        }
      }, 150);
      return () => clearInterval(t);
    }
    redraw();
  }, [editor, value.waypoints, selectedAnchorId, readOnly, mapReady, commit, currentEditor, routeSegments]);

  // Toque no mapa conforme o modo ativo.
  useEffect(() => {
    mapTapRef.current = (lat, lng) => {
      if (tool === "draw") {
        const change = appendAnchor(currentEditor(), lat, lng, drawStyle);
        commit(buildValue(valueRef.current, change.editor));
        routeSegments(change.toRoute);
        setSelectedAnchorId(null);
        return;
      }
      if (tool === "stop") {
        const v = valueRef.current;
        const n = v.waypoints.length + 1;
        commit({
          ...v,
          waypoints: [
            ...v.waypoints,
            {
              id: globalThis.crypto?.randomUUID?.() ?? `wp-${Date.now()}-${n}`,
              name: `Parada ${n}`,
              lat,
              lng,
            },
          ],
        });
        // Uma parada por vez: evita várias paradas criadas sem querer.
        setTool("move");
        return;
      }
      setSelectedAnchorId(null);
    };
  }, [tool, drawStyle, commit, currentEditor, routeSegments]);

  // Tela cheia: trava a rolagem da página e avisa o Leaflet do novo tamanho.
  useEffect(() => {
    const map = mapRef.current;
    if (fullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setFullscreen(false);
      };
      window.addEventListener("keydown", onKey);
      const t = setTimeout(() => map?.invalidateSize(), 50);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", onKey);
        clearTimeout(t);
      };
    }
    const t = setTimeout(() => map?.invalidateSize(), 50);
    return () => clearTimeout(t);
  }, [fullscreen]);

  const undo = () => {
    const ed = currentEditor();
    if (ed.anchors.length === 0) return;
    commit(buildValue(valueRef.current, removeLastAnchor(ed)));
    setSelectedAnchorId(null);
  };

  const removeSelected = () => {
    if (!selectedAnchorId) return;
    const change = removeAnchor(currentEditor(), selectedAnchorId);
    commit(buildValue(valueRef.current, change.editor));
    routeSegments(change.toRoute);
    setSelectedAnchorId(null);
  };

  const clearAll = () => {
    if (!window.confirm("Apagar toda a rota e as paradas?")) return;
    commit({ geojson: null, coordinates: [], waypoints: [], editor: { anchors: [], segments: [] } });
    setSelectedAnchorId(null);
    setRoutingIssue(null);
  };

  const retryFallbacks = () => {
    const ed = currentEditor();
    const retry: RouteSegment[] = [];
    const segments = ed.segments.map((s) => {
      if (s.status !== "fallback") return s;
      const pending: RouteSegment = { ...s, status: "pending" };
      retry.push(pending);
      return pending;
    });
    commit(buildValue(valueRef.current, { ...ed, segments }));
    setRoutingIssue(null);
    routeSegments(retry);
  };

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
  const readOnlyStartLegend =
    startMarkerLabel ?? DEFAULT_READ_ONLY_START_LABEL;

  const pointCount = editor.anchors.length;
  const hasRoute = pointCount >= 2;
  const pendingCount = editor.segments.filter((s) => s.status === "pending").length;
  const fallbackCount = editor.segments.filter((s) => s.status === "fallback").length;
  const distanceKm = hasRoute ? calculateDistanceKm(value.coordinates) : 0;

  let statusText: string;
  if (tool === "move") {
    statusText = hasRoute
      ? "Modo mover: arraste o mapa à vontade. Toque num ponto para selecioná-lo ou arraste-o para ajustar."
      : "Toque em “Traçar rota” para começar a marcar pontos.";
  } else if (tool === "stop") {
    statusText = "Toque no mapa onde fica a parada (ex.: posto, café).";
  } else if (pointCount === 0) {
    statusText = "Toque no mapa para marcar o início da rota.";
  } else if (pointCount === 1) {
    statusText = "Agora toque no próximo ponto do trajeto (mínimo 2 pontos).";
  } else {
    statusText = "Toque para continuar o trajeto. A rota já está válida.";
  }

  const toolButton = (t: MapTool, label: string, disabled = false) => (
    <button
      type="button"
      onClick={() => setTool(t)}
      disabled={disabled}
      aria-pressed={tool === t}
      className={`min-h-11 flex-1 rounded-lg px-2 text-sm font-medium transition-colors disabled:opacity-40 ${
        tool === t
          ? "bg-primary text-white shadow-sm"
          : "bg-transparent text-foreground hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

  const actionButtonClass =
    "min-h-11 rounded-lg border border-gray-200 bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40";

  const styles = (
    <style>{`
      .route-pin-icon.leaflet-div-icon, .route-anchor-icon.leaflet-div-icon { background: none !important; border: none !important; }
      .route-anchor-icon { display: flex !important; align-items: center; justify-content: center; }
      .route-anchor { display: block; border-radius: 9999px; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.45); }
      .route-anchor--start { width: 20px; height: 20px; background: ${START_PIN_COLOR}; }
      .route-anchor--end { width: 20px; height: 20px; background: ${END_PIN_COLOR}; }
      .route-anchor--mid { width: 14px; height: 14px; background: #fff; border-color: ${ROUTE_COLOR}; }
      .route-anchor--selected { outline: 4px solid rgba(25, 118, 210, .55); outline-offset: 2px; }
      .route-map-drawing .leaflet-container, .route-map-drawing .leaflet-grab { cursor: crosshair; }
      .route-map-edit .leaflet-touch .leaflet-bar a, .route-map-edit .leaflet-bar a { width: 40px; height: 40px; line-height: 40px; font-size: 20px; }
    `}</style>
  );

  if (readOnly) {
    return (
      <div className="space-y-3">
        {styles}
        {value.coordinates.length >= 2 ? (
          <p className="text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: START_PIN_COLOR }} />
              <span className="min-w-0">{readOnlyStartLegend}</span>
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
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {styles}
      <details className="rounded-xl border border-gray-200 bg-surface p-3 text-sm">
        <summary className="cursor-pointer font-medium text-foreground">
          Como desenhar a rota
        </summary>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-text-secondary">
          <li>
            Toque em <strong>Traçar rota</strong> e escolha o tipo: ciclovias e ruas,
            trilha/MTB ou linha livre.
          </li>
          <li>
            Toque no mapa para marcar o início e os pontos do trajeto (mínimo 2). O
            traçado segue as vias sozinho. Arrastar ou dar zoom não cria pontos.
          </li>
          <li>
            Arraste um ponto para ajustá-lo, ou toque nele e use{" "}
            <strong>Remover ponto</strong>. Depois, marque postos e cafés com{" "}
            <strong>Parada</strong>.
          </li>
        </ol>
      </details>

      <div
        className={
          fullscreen
            ? "route-map-edit fixed inset-0 z-[2000] flex flex-col gap-2 bg-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]"
            : "route-map-edit space-y-2"
        }
      >
        {fullscreen ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-foreground">Desenhar rota</p>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
            >
              Concluir
            </button>
          </div>
        ) : null}

        <div
          className="flex gap-1 rounded-xl border border-gray-200 bg-surface p-1"
          role="group"
          aria-label="Modo do mapa"
        >
          {toolButton("move", "✋ Mover")}
          {toolButton("draw", "✏️ Traçar rota")}
          {toolButton("stop", "📍 Parada", !hasRoute)}
        </div>

        {tool === "draw" ? (
          <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Tipo de traçado">
            {DRAW_STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setDrawStyle(s.value)}
                aria-pressed={drawStyle === s.value}
                title={s.hint}
                className={`min-h-10 shrink-0 rounded-full border px-3 text-sm transition-colors ${
                  drawStyle === s.value
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-gray-200 bg-surface text-foreground hover:bg-gray-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : null}

        <p className="text-sm text-text-secondary" aria-live="polite">
          {statusText}
        </p>

        <div className={fullscreen ? "relative min-h-0 flex-1" : "relative"}>
          {/* Borda, altura e cursor ficam no wrapper: o Leaflet adiciona classes
              ao container do mapa, e mudar o className dele pelo React as apagaria. */}
          <div
            className={`overflow-hidden rounded-xl border bg-surface ${
              tool === "move" ? "border-gray-200" : "route-map-drawing border-primary"
            } ${fullscreen ? "h-full" : ""}`.trim()}
            style={{ height: fullscreen ? undefined : safeHeight }}
          >
            <div
              ref={containerRef}
              className={`h-full w-full select-none ${containerClassName}`.trim()}
              style={{ WebkitUserSelect: "none", userSelect: "none" }}
            />
          </div>
          {!fullscreen ? (
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="absolute left-2 top-2 z-[1000] flex min-h-10 items-center gap-1 rounded-lg border border-gray-200 bg-surface px-3 text-sm font-medium text-foreground shadow-md"
              aria-label="Abrir mapa em tela cheia"
            >
              ⛶ Tela cheia
            </button>
          ) : null}
          {pendingCount > 0 ? (
            <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] rounded-lg bg-surface/95 px-3 py-1.5 text-xs font-medium text-foreground shadow">
              Calculando trajeto…
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={undo} disabled={pointCount === 0} className={actionButtonClass}>
            ↶ Desfazer
          </button>
          {selectedAnchorId && editor.anchors.some((a) => a.id === selectedAnchorId) ? (
            <button
              type="button"
              onClick={removeSelected}
              className="min-h-11 rounded-lg border border-red-200 bg-surface px-3 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Remover ponto
            </button>
          ) : null}
          <button
            type="button"
            onClick={clearAll}
            disabled={pointCount === 0 && value.waypoints.length === 0}
            className={actionButtonClass}
          >
            🗑 Limpar
          </button>
          <span className="ml-auto text-sm text-text-secondary">
            <strong className="text-foreground">{pointCount}</strong>{" "}
            {pointCount === 1 ? "ponto" : "pontos"}
            {hasRoute ? (
              <>
                {" · "}
                <strong className="text-foreground">{formatKm(distanceKm)} km</strong>
              </>
            ) : null}
          </span>
        </div>

        {routingIssue || fallbackCount > 0 ? (
          <div
            className="flex flex-col gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 sm:flex-row sm:items-center"
            role="status"
          >
            <p className="flex-1">
              {ROUTING_ISSUE_MESSAGES[routingIssue ?? "failed"]}
            </p>
            {fallbackCount > 0 && routingIssue !== "not_configured" ? (
              <button
                type="button"
                onClick={retryFallbacks}
                className="min-h-10 shrink-0 rounded-lg border border-orange-300 bg-white px-3 font-medium"
              >
                Tentar de novo
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {value.waypoints.length > 0 ? (
        <div className="rounded-xl border border-gray-100 bg-surface p-3 text-sm">
          <p className="font-medium text-foreground">Paradas</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Arraste o losango âmbar no mapa para ajustar a posição.
          </p>
          <ul className="mt-3 space-y-2" aria-label="Pontos de parada">
            {value.waypoints.map((wp, idx) => (
              <li key={wp.id} className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`${listId}-wp-${idx}`}>
                  Nome da parada {idx + 1}
                </label>
                <input
                  id={`${listId}-wp-${idx}`}
                  type="text"
                  value={wp.name}
                  onChange={(e) => renameWaypoint(wp.id, e.target.value)}
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-base text-foreground"
                  placeholder="Nome da parada"
                  maxLength={120}
                />
                <button
                  type="button"
                  onClick={() => removeWaypoint(wp.id)}
                  className="min-h-11 shrink-0 rounded-lg border border-red-200 px-3 text-sm text-red-700 hover:bg-red-50"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
