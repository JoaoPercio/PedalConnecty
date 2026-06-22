/**
 * Pin padronizado para mapas Leaflet (pedais, alertas, lojas).
 * Formato de gota com círculo branco central para emoji ou letra.
 */
import type { DivIcon } from "leaflet";

export const MAP_PIN_SIZE = { width: 44, height: 56 } as const;
export const MAP_PIN_ANCHOR = { x: 22, y: 56 } as const;
export const MAP_PIN_POPUP_ANCHOR = { x: 0, y: -52 } as const;

export interface MapPinColors {
  fill: string;
  inner?: string;
}

export const MAP_PIN_COLORS = {
  primary: { fill: "#1B5E20", inner: "#43A047" },
  secondary: { fill: "#2E7D32", inner: "#66BB6A" },
  accent: { fill: "#43A047", inner: "#66BB6A" },
  neutral: { fill: "#616161", inner: "#9E9E9E" },
  danger: { fill: "#C62828", inner: "#E53935" },
  warning: { fill: "#EF6C00", inner: "#FB8C00" },
  info: { fill: "#0277BD", inner: "#039BE5" },
  climb: { fill: "#6A1B9A", inner: "#8E24AA" },
} as const satisfies Record<string, MapPinColors>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPinSvg(colors: MapPinColors): string {
  const { fill, inner = colors.fill } = colors;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 56" width="44" height="56" aria-hidden="true">
      <path fill="${fill}" stroke="#ffffff" stroke-width="1.5"
        d="M22 3C12.8 3 5 10.5 5 19.2c0 7.8 6.5 16.5 17 33.8 10.5-17.3 17-26 17-33.8C39 10.5 31.2 3 22 3z"
        style="filter:drop-shadow(0 2px 4px rgba(27,94,32,0.35))"/>
      <path fill="${inner}" opacity="0.9"
        d="M22 6c-7.2 0-13 5.6-13 12.5 0 4.2 2.8 9.2 8.5 18.5 5.7-9.3 8.5-14.3 8.5-18.5C35 11.6 29.2 6 22 6z"/>
      <circle cx="22" cy="18.5" r="10" fill="#ffffff"/>
    </svg>`;
}

export interface MapPinContent {
  content: string;
  textColor?: string;
  fontSize?: number;
  /** Emojis precisam de centralização e fonte diferentes de letras */
  kind?: "text" | "emoji";
}

function buildPinHtml(colors: MapPinColors, content: MapPinContent): string {
  const {
    content: inner,
    textColor = "#1B5E20",
    fontSize = 15,
    kind = "text",
  } = content;
  const kindClass = kind === "emoji" ? " map-pin-content--emoji" : "";

  return `
    <div class="map-pin-wrap">
      ${buildPinSvg(colors)}
      <span class="map-pin-content${kindClass}" style="color:${textColor};font-size:${fontSize}px;">${escapeHtml(inner)}</span>
    </div>`;
}

export interface CreateMapPinIconOptions {
  L: typeof import("leaflet");
  className: string;
  colors?: MapPinColors;
  content: MapPinContent;
}

export function createMapPinIcon({
  L,
  className,
  colors = MAP_PIN_COLORS.primary,
  content,
}: CreateMapPinIconOptions): DivIcon {
  return L.divIcon({
    className,
    html: buildPinHtml(colors, content),
    iconSize: [MAP_PIN_SIZE.width, MAP_PIN_SIZE.height],
    iconAnchor: [MAP_PIN_ANCHOR.x, MAP_PIN_ANCHOR.y],
    popupAnchor: [MAP_PIN_POPUP_ANCHOR.x, MAP_PIN_POPUP_ANCHOR.y],
  });
}

export const MAP_PIN_STYLES = `
  .map-pin-marker.leaflet-div-icon,
  .pedal-nearby-marker.leaflet-div-icon,
  .map-alert-marker.leaflet-div-icon,
  .bike-service-marker.leaflet-div-icon {
    background: transparent !important;
    border: none !important;
  }
  .map-pin-wrap {
    position: relative;
    width: 44px;
    height: 56px;
    line-height: 0;
  }
  .map-pin-wrap svg {
    display: block;
  }
  .map-pin-content {
    position: absolute;
    left: 12px;
    top: 8.5px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: system-ui, sans-serif;
    font-weight: 700;
    line-height: 1;
    pointer-events: none;
    user-select: none;
  }
  .map-pin-content--emoji {
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
    font-weight: 400;
    letter-spacing: 0;
  }
`;
