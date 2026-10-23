/**
 * Ícones dos POIs de bicicleta (Leaflet imperativo em BikeServicesMap).
 * Não usa react-leaflet para evitar "Map container is already initialized" no Next.js.
 */
import L from "leaflet";
import type { BikeServiceKind } from "@/lib/bike-services-overpass";
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
  posto: { emoji: "⛽", colors: MAP_PIN_COLORS.fuel },
};

/** Emoji e cores do tipo de local (pins e cards). */
export function bikeServiceKindStyle(kind: BikeServiceKind): { emoji: string; colors: MapPinColors } {
  return KIND_PIN_CONFIG[kind];
}

/** Pin de um tipo de local; `selected` aumenta e destaca o pin. */
export function createKindIcon(kind: BikeServiceKind, selected: boolean): L.DivIcon {
  const { emoji, colors } = KIND_PIN_CONFIG[kind];
  return createMapPinIcon({
    L,
    className: `bike-service-marker${selected ? " is-selected" : ""}`,
    colors,
    content: { content: emoji, fontSize: 14, kind: "emoji" },
  });
}
