import type {
  PedalAgeGroup,
  PedalDifficulty,
  PedalTerrain,
  PedalVisibility,
} from "@/lib/pedals";

export const DISTANCE_OPTIONS_KM = [5, 10, 15, 20, 30, 50, 100] as const;

/** Quando o pedal acontece: hoje ou no próximo fim de semana (sáb/dom). */
export type PedalWhenFilter = "" | "today" | "weekend";

export interface PedalFiltersState {
  maxDistanceKm: number;
  difficulty: "" | PedalDifficulty;
  femaleOnly: boolean;
  ageGroup: "" | PedalAgeGroup;
  onlyFuture: boolean;
  onlyWithSlots: boolean;
  terrain: "" | PedalTerrain;
  when: PedalWhenFilter;
}

export const DEFAULT_PEDAL_FILTERS: PedalFiltersState = {
  maxDistanceKm: 30,
  difficulty: "",
  femaleOnly: false,
  ageGroup: "",
  onlyFuture: true,
  onlyWithSlots: false,
  terrain: "",
  when: "",
};

export interface EnrichedNearbyPedal {
  id: string;
  name: string;
  date: string;
  distance_km: number | null;
  difficulty: PedalDifficulty | null;
  terrain: PedalTerrain | null;
  age_group: PedalAgeGroup | null;
  visibility: PedalVisibility;
  max_participants: number | null;
  cover_image_url: string | null;
  start_lat: number;
  start_lng: number;
  computedDistanceKm: number;
  approved_count: number;
  /** scheduled | in_progress | completed | cancelled */
  status?: string;
}

export function countActiveFilters(f: PedalFiltersState): number {
  let n = 0;
  if (f.maxDistanceKm !== DEFAULT_PEDAL_FILTERS.maxDistanceKm) n++;
  if (f.difficulty) n++;
  if (f.femaleOnly) n++;
  if (f.ageGroup) n++;
  if (!f.onlyFuture) n++;
  if (f.onlyWithSlots) n++;
  if (f.terrain) n++;
  if (f.when) n++;
  return n;
}

export function describeActiveFilters(f: PedalFiltersState): string[] {
  return getFilterChips(f).map((chip) => chip.label);
}

export interface FilterChip {
  id: string;
  label: string;
}

const DIFFICULTY_CHIP_LABELS: Record<PedalDifficulty, string> = {
  iniciante: "Fácil",
  intermediario: "Moderado",
  avancado: "Difícil",
};

const AGE_GROUP_CHIP_LABELS: Record<PedalAgeGroup, string> = {
  todas: "Todas as idades",
  adultos: "Adultos",
  melhor_idade: "Melhor idade",
};

const TERRAIN_CHIP_LABELS: Record<PedalTerrain, string> = {
  asfalto: "Asfalto",
  terra: "Terra",
  misto: "Misto",
  trilha: "Trilha",
};

/** Chips só dos filtros que fogem do padrão (os removíveis com "×"). */
export function getFilterChips(f: PedalFiltersState): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.maxDistanceKm !== DEFAULT_PEDAL_FILTERS.maxDistanceKm) {
    chips.push({ id: "distance", label: `Até ${f.maxDistanceKm} km` });
  }
  if (f.difficulty) {
    chips.push({ id: "difficulty", label: DIFFICULTY_CHIP_LABELS[f.difficulty] });
  }
  if (f.when === "today") chips.push({ id: "when", label: "Hoje" });
  if (f.when === "weekend") chips.push({ id: "when", label: "Fim de semana" });
  if (!f.onlyFuture) chips.push({ id: "future", label: "Inclui passados" });
  if (f.onlyWithSlots) chips.push({ id: "slots", label: "Com vagas" });
  if (f.femaleOnly) chips.push({ id: "female", label: "Só mulheres" });
  if (f.ageGroup) {
    chips.push({
      id: "age",
      label: AGE_GROUP_CHIP_LABELS[f.ageGroup],
    });
  }
  if (f.terrain) chips.push({ id: "terrain", label: TERRAIN_CHIP_LABELS[f.terrain] });

  return chips;
}

export function removeFilterChip(
  f: PedalFiltersState,
  chipId: string
): PedalFiltersState {
  switch (chipId) {
    case "distance":
      return { ...f, maxDistanceKm: DEFAULT_PEDAL_FILTERS.maxDistanceKm };
    case "difficulty":
      return { ...f, difficulty: "" };
    case "future":
      return { ...f, onlyFuture: DEFAULT_PEDAL_FILTERS.onlyFuture };
    case "when":
      return { ...f, when: "" };
    case "slots":
      return { ...f, onlyWithSlots: false };
    case "female":
      return { ...f, femaleOnly: false };
    case "age":
      return { ...f, ageGroup: "" };
    case "terrain":
      return { ...f, terrain: "" };
    default:
      return f;
  }
}

/** Atalhos de filtro mostrados como chips no topo do mapa. */
export const QUICK_FILTERS: {
  id: string;
  label: string;
  isActive: (f: PedalFiltersState) => boolean;
  toggle: (f: PedalFiltersState) => PedalFiltersState;
}[] = [
  {
    id: "today",
    label: "Hoje",
    isActive: (f) => f.when === "today",
    toggle: (f) => ({ ...f, when: f.when === "today" ? "" : "today" }),
  },
  {
    id: "weekend",
    label: "Fim de semana",
    isActive: (f) => f.when === "weekend",
    toggle: (f) => ({ ...f, when: f.when === "weekend" ? "" : "weekend" }),
  },
  {
    id: "slots",
    label: "Com vagas",
    isActive: (f) => f.onlyWithSlots,
    toggle: (f) => ({ ...f, onlyWithSlots: !f.onlyWithSlots }),
  },
  {
    id: "beginner",
    label: "Iniciante",
    isActive: (f) => f.difficulty === "iniciante",
    toggle: (f) => ({ ...f, difficulty: f.difficulty === "iniciante" ? "" : "iniciante" }),
  },
  {
    id: "asphalt",
    label: "Asfalto",
    isActive: (f) => f.terrain === "asfalto",
    toggle: (f) => ({ ...f, terrain: f.terrain === "asfalto" ? "" : "asfalto" }),
  },
  {
    id: "trail",
    label: "Trilha",
    isActive: (f) => f.terrain === "trilha",
    toggle: (f) => ({ ...f, terrain: f.terrain === "trilha" ? "" : "trilha" }),
  },
];

/** IDs de chips já representados por um atalho (não repetir como chip "×"). */
export function chipCoveredByQuickFilter(chip: FilterChip, f: PedalFiltersState): boolean {
  if (chip.id === "when" || chip.id === "slots") return true;
  if (chip.id === "difficulty") return f.difficulty === "iniciante";
  if (chip.id === "terrain") return f.terrain === "asfalto" || f.terrain === "trilha";
  return false;
}

function matchesWhen(dateIso: string, when: PedalWhenFilter, now: Date): boolean {
  if (!when) return true;
  const d = new Date(dateIso);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (when === "today") {
    const end = new Date(dayStart);
    end.setDate(end.getDate() + 1);
    return d >= dayStart && d < end;
  }
  // Próximo fim de semana (ou o atual, se hoje já for sábado/domingo).
  const dow = dayStart.getDay();
  const sat = new Date(dayStart);
  if (dow === 0) sat.setDate(sat.getDate() - 1);
  else sat.setDate(sat.getDate() + (6 - dow));
  const mondayAfter = new Date(sat);
  mondayAfter.setDate(mondayAfter.getDate() + 2);
  return d >= sat && d < mondayAfter;
}

export function applyPedalFilters(
  pedals: EnrichedNearbyPedal[],
  filters: PedalFiltersState,
  now: Date = new Date()
): EnrichedNearbyPedal[] {
  const nowMs = now.getTime();
  return pedals.filter((p) => {
    if (p.computedDistanceKm > filters.maxDistanceKm) return false;
    if (filters.difficulty && p.difficulty !== filters.difficulty) return false;
    if (filters.femaleOnly && p.visibility !== "female_only") return false;
    if (filters.ageGroup && p.age_group !== filters.ageGroup) return false;
    if (filters.onlyFuture && new Date(p.date).getTime() <= nowMs) return false;
    if (filters.onlyWithSlots) {
      if (
        p.max_participants != null &&
        p.approved_count >= p.max_participants
      ) {
        return false;
      }
    }
    if (filters.terrain && p.terrain !== filters.terrain) return false;
    if (!matchesWhen(p.date, filters.when, now)) return false;
    return true;
  });
}
