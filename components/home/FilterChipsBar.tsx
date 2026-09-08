"use client";

import type { FilterChip } from "@/lib/pedal-filters";

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </svg>
  );
}

interface FilterChipsBarProps {
  chips: FilterChip[];
  activeCount: number;
  onRemoveChip: (chipId: string) => void;
  onOpenFilters: () => void;
  className?: string;
}

export function FilterChipsBar({
  chips,
  activeCount,
  onRemoveChip,
  onOpenFilters,
  className = "",
}: FilterChipsBarProps) {
  return (
    <div
      className={`pointer-events-none flex items-center gap-2 ${className}`}
    >
      <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onRemoveChip(chip.id)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-gray-50"
            aria-label={`Remover filtro ${chip.label}`}
          >
            {chip.label}
            <span className="text-text-secondary" aria-hidden>
              ×
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenFilters}
        className="pointer-events-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
      >
        <SlidersIcon className="h-3.5 w-3.5" />
        Filtros
        {activeCount > 0 ? (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
            {activeCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
