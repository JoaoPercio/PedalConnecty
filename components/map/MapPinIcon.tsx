import type { DivIcon, DivIconOptions } from "leaflet";

export interface MapPinColors {
  fill: string;
  inner: string;
}

export const MAP_PIN_COLORS = {
  primary: { fill: "#1B5E20", inner: "#43A047" },
  secondary: { fill: "#2E7D32", inner: "#66BB6A" },
  accent: { fill: "#0277BD", inner: "#039BE5" },
  neutral: { fill: "#616161", inner: "#9E9E9E" },
  fuel: { fill: "#E65100", inner: "#FF9800" },
} as const satisfies Record<string, MapPinColors>;

type MapPinContent =
  | { content: string; textColor: string; fontSize: number }
  | { content: string; fontSize: number; kind: "emoji" };

interface CreateMapPinIconOptions {
  L: typeof import("leaflet");
  className: string;
  colors: MapPinColors;
  content: MapPinContent;
}

function pinHtml(colors: MapPinColors, content: MapPinContent): string {
  let inner: string;
  if ("kind" in content && content.kind === "emoji") {
    inner = `<span style="font-size:${content.fontSize}px;line-height:1">${content.content}</span>`;
  } else {
    const text = content as Extract<MapPinContent, { textColor: string }>;
    inner = `<span style="font-size:${text.fontSize}px;font-weight:700;color:${text.textColor};line-height:1">${text.content}</span>`;
  }

  return `
    <div class="map-pin" style="--pin-fill:${colors.fill};--pin-inner:${colors.inner}">
      <div class="map-pin__bubble">${inner}</div>
      <div class="map-pin__tail"></div>
    </div>
  `;
}

export function createMapPinIcon({
  L,
  className,
  colors,
  content,
}: CreateMapPinIconOptions): DivIcon {
  const html = pinHtml(colors, content);
  const options: DivIconOptions = {
    className: `map-pin-icon ${className}`,
    html,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40],
  };
  return L.divIcon(options);
}

export const MAP_PIN_STYLES = `
  .map-pin-icon {
    background: transparent !important;
    border: none !important;
  }
  .map-pin {
    position: relative;
    width: 36px;
    height: 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
  }
  .map-pin__bubble {
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: linear-gradient(135deg, var(--pin-inner), var(--pin-fill));
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #ffffff;
  }
  .map-pin__bubble > span {
    transform: rotate(45deg);
    display: block;
  }
  .map-pin__tail {
    width: 0;
    height: 0;
    margin-top: -4px;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid var(--pin-fill);
  }
`;
