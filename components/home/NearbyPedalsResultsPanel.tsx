"use client";

import type { EnrichedNearbyPedal } from "@/lib/pedal-filters";
import { NearbyPedalResultCard } from "./NearbyPedalResultCard";

interface NearbyPedalsResultsPanelProps {
  pedals: EnrichedNearbyPedal[];
  selectedId: string | null;
  onSelectPedal: (id: string) => void;
  loading?: boolean;
}

export function NearbyPedalsResultsPanel({
  pedals,
  selectedId,
  onSelectPedal,
  loading = false,
}: NearbyPedalsResultsPanelProps) {
  const count = pedals.length;
  const countLabel =
    count === 1 ? "1 pedal encontrado" : `${count} pedais encontrados`;

  const content = (
    <>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Pedais próximos</h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          {loading ? "Carregando…" : countLabel}
        </p>
      </div>

      {!loading && count === 0 ? (
        <p className="rounded-xl bg-background px-3 py-4 text-center text-sm text-text-secondary">
          Nenhum pedal encontrado com os filtros selecionados.
        </p>
      ) : (
        <div className="space-y-2">
          {pedals.map((pedal) => (
            <NearbyPedalResultCard
              key={pedal.id}
              pedal={pedal}
              selected={pedal.id === selectedId}
              onSelect={() => onSelectPedal(pedal.id)}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop: floating card bottom-left */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] hidden w-[min(100%,28rem)] lg:left-80 lg:block">
        <div className="pointer-events-auto max-h-[min(50dvh,22rem)] overflow-y-auto rounded-2xl border border-gray-200/80 bg-surface/95 p-4 shadow-lg backdrop-blur-sm">
          {content}
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] lg:hidden">
        <div className="pointer-events-auto rounded-t-2xl border border-b-0 border-gray-200 bg-surface px-4 pb-2 pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300"
            aria-hidden
          />
          <div className="max-h-[min(42dvh,20rem)] overflow-y-auto pb-1">
            {content}
          </div>
        </div>
      </div>
    </>
  );
}
