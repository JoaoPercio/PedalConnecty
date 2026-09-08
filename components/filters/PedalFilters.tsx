"use client";

import type { PedalAgeGroup, PedalDifficulty, PedalTerrain } from "@/lib/pedals";
import type { PedalFiltersState } from "@/lib/pedal-filters";
import { DISTANCE_OPTIONS_KM } from "@/lib/pedal-filters";
import { FilterSwitch } from "@/components/filters/FilterSwitch";

const DIFFICULTY_OPTIONS: { value: PedalDifficulty; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
];

const TERRAIN_OPTIONS: { value: PedalTerrain; label: string }[] = [
  { value: "asfalto", label: "Asfalto" },
  { value: "terra", label: "Terra" },
  { value: "misto", label: "Misto" },
  { value: "trilha", label: "Trilha" },
];

const AGE_GROUP_OPTIONS: { value: PedalAgeGroup; label: string }[] = [
  { value: "todas", label: "Todas as idades" },
  { value: "adultos", label: "Adultos" },
  { value: "melhor_idade", label: "Melhor idade" },
];

const selectClass =
  "w-full rounded-xl border border-gray-200 bg-surface px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";
const labelClass = "mb-1 block text-xs font-medium text-text-secondary";

interface PedalFiltersProps {
  value: PedalFiltersState;
  onChange: (next: PedalFiltersState) => void;
  onClear: () => void;
  className?: string;
  variant?: "default" | "panel";
}

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

export function PedalFilters({
  value,
  onChange,
  onClear,
  className = "",
  variant = "default",
}: PedalFiltersProps) {
  const patch = (partial: Partial<PedalFiltersState>) => {
    onChange({ ...value, ...partial });
  };

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

      <div>
        <label htmlFor="filter-distance" className={labelClass}>
          Distância máxima
        </label>
        <select
          id="filter-distance"
          className={selectClass}
          value={value.maxDistanceKm}
          onChange={(e) =>
            patch({ maxDistanceKm: Number(e.target.value) || 30 })
          }
        >
          {DISTANCE_OPTIONS_KM.map((km) => (
            <option key={km} value={km}>
              Até {km} km
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-difficulty" className={labelClass}>
          Dificuldade
        </label>
        <select
          id="filter-difficulty"
          className={selectClass}
          value={value.difficulty}
          onChange={(e) =>
            patch({
              difficulty: e.target.value as PedalFiltersState["difficulty"],
            })
          }
        >
          <option value="">Qualquer</option>
          {DIFFICULTY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <FilterSwitch
        label="Só pedais para mulheres"
        checked={value.femaleOnly}
        onCheckedChange={(femaleOnly) => patch({ femaleOnly })}
      />

      <div>
        <label htmlFor="filter-age" className={labelClass}>
          Faixa etária
        </label>
        <select
          id="filter-age"
          className={selectClass}
          value={value.ageGroup}
          onChange={(e) =>
            patch({ ageGroup: e.target.value as PedalFiltersState["ageGroup"] })
          }
        >
          <option value="">Qualquer</option>
          {AGE_GROUP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <FilterSwitch
        label="Só pedais futuros"
        checked={value.onlyFuture}
        onCheckedChange={(onlyFuture) => patch({ onlyFuture })}
      />

      <FilterSwitch
        label="Só com vagas"
        checked={value.onlyWithSlots}
        onCheckedChange={(onlyWithSlots) => patch({ onlyWithSlots })}
      />

      {!isPanel ? (
        <div>
          <label htmlFor="filter-terrain" className={labelClass}>
            Terreno (opcional)
          </label>
          <select
            id="filter-terrain"
            className={selectClass}
            value={value.terrain}
            onChange={(e) =>
              patch({ terrain: e.target.value as PedalFiltersState["terrain"] })
            }
          >
            <option value="">Qualquer</option>
            {TERRAIN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

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
