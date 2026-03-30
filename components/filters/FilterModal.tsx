"use client";

import { useEffect } from "react";
import type { PedalFiltersState } from "@/lib/pedal-filters";
import { PedalFilters } from "./PedalFilters";

interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  filters: PedalFiltersState;
  onFiltersChange: (next: PedalFiltersState) => void;
  onClear: () => void;
}

export function FilterModal({
  open,
  onClose,
  filters,
  onFiltersChange,
  onClear,
}: FilterModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 transition-opacity duration-200"
        aria-label="Fechar filtros"
        onClick={onClose}
      />

      <div
        className="relative flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-gray-200 bg-surface shadow-xl transition-transform duration-200 ease-out sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 id="filter-modal-title" className="text-lg font-semibold text-foreground">
            Filtrar pedais
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 hover:text-foreground"
            aria-label="Fechar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <PedalFilters
            value={filters}
            onChange={onFiltersChange}
            onClear={onClear}
          />
        </div>

        <div className="shrink-0 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
          >
            Aplicar e ver mapa
          </button>
        </div>
      </div>
    </div>
  );
}
