"use client";

import Link from "next/link";
import type { EnrichedNearbyPedal } from "@/lib/pedal-filters";
import { FloatingCreatePedalButton } from "@/components/FloatingCreatePedalButton";
import { BikeIcon } from "@/components/pedals/my-pedals-icons";
import { MapLocateButton } from "@/components/map/map-ui";
import {
  MapEmptyState,
  mapPrimaryActionClass,
  MapResultsSheet,
  mapSecondaryActionClass,
} from "@/components/map/MapResultsSheet";
import {
  NearbyPedalCardSkeleton,
  NearbyPedalResultCard,
} from "./NearbyPedalResultCard";

interface NearbyPedalsResultsPanelProps {
  pedals: EnrichedNearbyPedal[];
  selectedId: string | null;
  onSelectPedal: (id: string) => void;
  loading?: boolean;
  /** Muda quando o pin é tocado no mapa (traz o card dele para a vista). */
  focusNonce?: number;
  onLocate: () => void;
  /** Próximo raio maior, para o botão "Aumentar raio" do estado vazio. */
  nextRadiusKm?: number | null;
  onExpandRadius?: () => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

/** Resultados de pedais próximos (painel arrastável no celular, lista no desktop). */
export function NearbyPedalsResultsPanel({
  pedals,
  selectedId,
  onSelectPedal,
  loading = false,
  focusNonce = 0,
  onLocate,
  nextRadiusKm = null,
  onExpandRadius,
  hasActiveFilters = false,
  onClearFilters,
}: NearbyPedalsResultsPanelProps) {
  const count = pedals.length;
  const title = loading
    ? "Buscando pedais…"
    : count === 0
      ? "Nenhum pedal por perto"
      : count === 1
        ? "1 pedal perto de você"
        : `${count} pedais perto de você`;

  return (
    <MapResultsSheet
      items={pedals}
      getId={(p) => p.id}
      renderCard={(pedal, { selected, variant }) => (
        <NearbyPedalResultCard pedal={pedal} selected={selected} variant={variant} />
      )}
      renderSkeleton={(variant) => <NearbyPedalCardSkeleton variant={variant} />}
      selectedId={selectedId}
      onSelect={onSelectPedal}
      focusNonce={focusNonce}
      loading={loading}
      title={title}
      ariaLabel="Pedais próximos"
      controls={
        <>
          <MapLocateButton onClick={onLocate} />
          <FloatingCreatePedalButton placement="inline" />
        </>
      }
      emptyState={
        <MapEmptyState
          icon={<BikeIcon className="h-6 w-6" />}
          title="Nenhum pedal por aqui"
          description={
            hasActiveFilters
              ? "Tente tirar alguns filtros ou aumentar o raio."
              : "Aumente o raio de busca ou crie o primeiro pedal da região."
          }
          actions={
            <>
              {hasActiveFilters && onClearFilters ? (
                <button type="button" onClick={onClearFilters} className={mapSecondaryActionClass}>
                  Limpar filtros
                </button>
              ) : nextRadiusKm && onExpandRadius ? (
                <button type="button" onClick={onExpandRadius} className={mapSecondaryActionClass}>
                  Aumentar para {nextRadiusKm} km
                </button>
              ) : null}
              <Link href="/pedals/create" className={mapPrimaryActionClass}>
                Criar pedal
              </Link>
            </>
          }
        />
      }
    />
  );
}
