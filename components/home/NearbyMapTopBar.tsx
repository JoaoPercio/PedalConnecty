"use client";

import type { ReactNode } from "react";
import {
  chipCoveredByQuickFilter,
  getFilterChips,
  QUICK_FILTERS,
  type PedalFiltersState,
} from "@/lib/pedal-filters";
import { MapChip, MapTopBar } from "@/components/map/map-ui";

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2a8 8 0 0 0-8 8c0 5.6 7.1 11.4 7.4 11.7a1 1 0 0 0 1.2 0C12.9 21.4 20 15.6 20 10a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
    </svg>
  );
}

interface NearbyMapTopBarProps {
  filters: PedalFiltersState;
  activeCount: number;
  onFiltersChange: (next: PedalFiltersState) => void;
  onRemoveChip: (chipId: string) => void;
  onOpenFilters: () => void;
  loading?: boolean;
  /** Primeiro item da fileira de atalhos (ex.: chip de localização). */
  leadingChip?: ReactNode;
}

/**
 * Topo flutuante do mapa de pedais perto: cápsula (raio + filtros) e atalhos.
 * Só filtros ativos que não são atalhos aparecem como chips "×" extras.
 */
export function NearbyMapTopBar({
  filters,
  activeCount,
  onFiltersChange,
  onRemoveChip,
  onOpenFilters,
  loading = false,
  leadingChip,
}: NearbyMapTopBarProps) {
  const extraChips = getFilterChips(filters).filter(
    (chip) => !chipCoveredByQuickFilter(chip, filters)
  );

  return (
    <MapTopBar
      icon={<LocationIcon className="h-4 w-4" />}
      title="Perto de você"
      subtitle={`até ${filters.maxDistanceKm} km`}
      activeCount={activeCount}
      onOpenFilters={onOpenFilters}
      loading={loading}
      loadingLabel="Carregando pedais"
    >
      {leadingChip}
      {extraChips.map((chip) => (
        <MapChip
          key={chip.id}
          active
          onClick={() => onRemoveChip(chip.id)}
          ariaLabel={`Remover filtro ${chip.label}`}
        >
          {chip.label}
        </MapChip>
      ))}
      {QUICK_FILTERS.map((q) => (
        <MapChip
          key={q.id}
          active={q.isActive(filters)}
          onClick={() => onFiltersChange(q.toggle(filters))}
        >
          {q.label}
        </MapChip>
      ))}
    </MapTopBar>
  );
}
