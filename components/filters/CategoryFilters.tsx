"use client";

import { FilterSwitch } from "@/components/filters/FilterSwitch";

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

export interface CategoryFilterOption {
  id: string;
  label: string;
}

interface CategoryFiltersProps {
  options: CategoryFilterOption[];
  value: Record<string, boolean>;
  onChange: (id: string, next: boolean) => void;
  onClear: () => void;
  className?: string;
  variant?: "default" | "panel";
}

export function CategoryFilters({
  options,
  value,
  onChange,
  onClear,
  className = "",
  variant = "default",
}: CategoryFiltersProps) {
  const isPanel = variant === "panel";

  return (
    <div
      className={`flex flex-col gap-4 transition-opacity duration-200 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Filtros</p>
        {isPanel ? (
          <SlidersIcon className="h-4 w-4 text-text-secondary" />
        ) : (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-primary hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <FilterSwitch
            key={option.id}
            label={option.label}
            checked={Boolean(value[option.id])}
            onCheckedChange={(next) => onChange(option.id, next)}
          />
        ))}
      </div>

      {isPanel ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 text-left text-sm font-medium text-primary hover:underline"
        >
          Limpar filtros
        </button>
      ) : null}
    </div>
  );
}
