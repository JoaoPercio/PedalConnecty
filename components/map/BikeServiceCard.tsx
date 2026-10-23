"use client";

import { kindLabel, type BikeServicePlace } from "@/lib/bike-services-overpass";
import { bikeServiceKindStyle } from "@/components/map/BikeServiceMarker";
import type { MapCardVariant } from "@/components/map/MapResultsSheet";

function formatKm(km: number): string {
  return km.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function phoneOf(place: BikeServicePlace): string | null {
  const raw = place.tags.phone ?? place.tags["contact:phone"];
  return raw ? raw.split(";")[0].trim() : null;
}

interface BikeServiceCardProps {
  place: BikeServicePlace;
  distanceKm: number;
  selected: boolean;
  variant: MapCardVariant;
  onSelect: () => void;
}

export function BikeServiceCard({
  place,
  distanceKm,
  selected,
  variant,
  onSelect,
}: BikeServiceCardProps) {
  const { emoji, colors } = bikeServiceKindStyle(place.kind);
  const hours = place.tags.opening_hours?.trim();
  const phone = phoneOf(place);
  const compact = variant === "carousel";
  const actionClass =
    "inline-flex min-h-9 items-center justify-center gap-1 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition active:scale-95";

  return (
    <div
      className={`rounded-2xl bg-surface p-2.5 transition-shadow ${
        selected ? "shadow-md ring-2 ring-primary/70" : "shadow-sm ring-1 ring-black/5"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full min-w-0 items-center gap-3 text-left focus:outline-none"
        aria-label={`${place.name}: ver no mapa`}
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl"
          style={{ background: `${colors.inner}22`, boxShadow: `inset 0 0 0 1.5px ${colors.inner}55` }}
          aria-hidden
        >
          {emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{place.name}</span>
          <span className="mt-0.5 block truncate text-xs text-text-secondary">
            {kindLabel(place.kind)} · {formatKm(distanceKm)} km
          </span>
          {hours && !compact ? (
            <span className="mt-0.5 block truncate text-[11px] text-text-secondary">🕒 {hours}</span>
          ) : null}
        </span>
      </button>
      <div className="mt-2 flex gap-2 pl-[3.75rem]">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${actionClass} bg-primary text-white shadow-sm`}
        >
          Como chegar
        </a>
        {phone ? (
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={`${actionClass} bg-surface text-primary ring-1 ring-primary/30`}>
            Ligar
          </a>
        ) : null}
      </div>
    </div>
  );
}
