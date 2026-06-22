/**
 * Ícones e HTML de popup para POIs de bicicleta (Leaflet imperativo em BikeServicesMap).
 * Não usa react-leaflet para evitar "Map container is already initialized" no Next.js.
 */
import L from "leaflet";
import {
  haversineKm,
  kindLabel,
  type BikeServiceKind,
  type BikeServicePlace,
} from "@/lib/bike-services-overpass";
import {
  createMapPinIcon,
  MAP_PIN_COLORS,
  type MapPinColors,
} from "@/components/map/MapPinIcon";

const KIND_PIN_CONFIG: Record<
  BikeServiceKind,
  { emoji: string; colors: MapPinColors }
> = {
  loja: { emoji: "🏪", colors: MAP_PIN_COLORS.primary },
  oficina: { emoji: "🔧", colors: MAP_PIN_COLORS.secondary },
  aluguel: { emoji: "🚲", colors: MAP_PIN_COLORS.accent },
  estacao: { emoji: "🛠️", colors: MAP_PIN_COLORS.neutral },
};

export function createKindIcons(): Record<BikeServiceKind, L.DivIcon> {
  return Object.fromEntries(
    (Object.entries(KIND_PIN_CONFIG) as [BikeServiceKind, (typeof KIND_PIN_CONFIG)[BikeServiceKind]][]).map(
      ([kind, { emoji, colors }]) => [
        kind,
        createMapPinIcon({
          L,
          className: "bike-service-marker",
          colors,
          content: { content: emoji, fontSize: 14, kind: "emoji" },
        }),
      ]
    )
  ) as Record<BikeServiceKind, L.DivIcon>;
}

function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function escapeHtml(text: string): string {
  if (typeof document === "undefined") {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

export function buildBikeServicePopupHtml(
  place: BikeServicePlace,
  userLat: number,
  userLng: number
): string {
  const dist = haversineKm(userLat, userLng, place.lat, place.lng);
  const name = escapeHtml(place.name);
  const type = escapeHtml(kindLabel(place.kind));
  const gUrl = googleMapsUrl(place.lat, place.lng);
  return `
    <div style="min-width:200px;font-family:system-ui,sans-serif;font-size:14px;color:#1C1C1C;">
      <p style="font-weight:600;margin:0 0 6px;line-height:1.25;">${name}</p>
      <p style="margin:0 0 4px;color:#616161;font-size:13px;">${type}</p>
      <p style="margin:0 0 8px;font-size:11px;color:#616161;">Distância: ${dist} km</p>
      <a href="${gUrl}" target="_blank" rel="noopener noreferrer"
        style="display:inline-flex;width:100%;box-sizing:border-box;justify-content:center;align-items:center;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:600;color:#fff;text-decoration:none;background:linear-gradient(to right,#1B5E20,#43A047);">
        Abrir no Google Maps
      </a>
    </div>
  `;
}
