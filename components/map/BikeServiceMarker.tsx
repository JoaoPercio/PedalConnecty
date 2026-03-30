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

export function createKindIcons(): Record<BikeServiceKind, L.DivIcon> {
  const mk = (emoji: string, bg: string) =>
    L.divIcon({
      className: "bike-service-marker",
      html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:${bg};box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:16px;">${emoji}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -28],
    });

  return {
    loja: mk("🏪", "#1B5E20"),
    oficina: mk("🔧", "#2E7D32"),
    aluguel: mk("🚲", "#43A047"),
    estacao: mk("🛠️", "#616161"),
  };
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
