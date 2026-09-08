"use client";

import type { ReactNode } from "react";
import { FilterChipsBar } from "@/components/home/FilterChipsBar";
import type { FilterChip } from "@/lib/pedal-filters";

interface MapFilterChromeProps {
  chips: FilterChip[];
  activeCount: number;
  onRemoveChip: (chipId: string) => void;
  onOpenFilters: () => void;
  loading?: boolean;
  loadingLabel?: string;
  desktopPanel: ReactNode;
  children: ReactNode;
}

export function MapFilterChrome({
  chips,
  activeCount,
  onRemoveChip,
  onOpenFilters,
  loading = false,
  loadingLabel = "Carregando",
  desktopPanel,
  children,
}: MapFilterChromeProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <div className="relative z-[500] shrink-0 border-b border-gray-100 bg-surface/95 px-4 py-2 backdrop-blur-sm lg:absolute lg:left-80 lg:right-0 lg:top-4 lg:border-0 lg:bg-transparent lg:px-4 lg:py-0">
        <FilterChipsBar
          chips={chips}
          activeCount={activeCount}
          onRemoveChip={onRemoveChip}
          onOpenFilters={onOpenFilters}
        />
        {loading ? (
          <div className="mt-2 flex justify-end lg:justify-start">
            <span
              className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-label={loadingLabel}
            />
          </div>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1">
        {children}

        <aside className="pointer-events-none absolute left-4 top-4 z-[500] hidden max-h-[calc(100%-2rem)] w-72 lg:flex">
          <div className="pointer-events-auto min-h-0 w-full overflow-y-auto rounded-2xl border border-gray-200/80 bg-surface/95 p-4 shadow-lg backdrop-blur-sm">
            {desktopPanel}
          </div>
        </aside>
      </div>
    </div>
  );
}
