import type {
  PedalAgeGroup,
  PedalDifficulty,
  PedalTerrain,
  PedalVisibility,
} from "@/lib/pedals";

export const DISTANCE_OPTIONS_KM = [5, 10, 15, 20, 30, 50, 100] as const;

export interface PedalFiltersState {
  maxDistanceKm: number;
  difficulty: "" | PedalDifficulty;
  femaleOnly: boolean;
  ageGroup: "" | PedalAgeGroup;
  onlyFuture: boolean;
  onlyWithSlots: boolean;
  terrain: "" | PedalTerrain;
}

export const DEFAULT_PEDAL_FILTERS: PedalFiltersState = {
  maxDistanceKm: 30,
  difficulty: "",
  femaleOnly: false,
  ageGroup: "",
  onlyFuture: true,
  onlyWithSlots: false,
  terrain: "",
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

export function getFilterChips(f: PedalFiltersState): FilterChip[] {
  const chips: FilterChip[] = [
    { id: "distance", label: `Até ${f.maxDistanceKm} km` },
    {
      id: "difficulty",
      label: f.difficulty
        ? DIFFICULTY_CHIP_LABELS[f.difficulty]
        : "Qualquer dificuldade",
    },
  ];

  if (f.onlyFuture) chips.push({ id: "future", label: "Próximos" });
  if (f.onlyWithSlots) chips.push({ id: "slots", label: "Com vagas" });
  if (f.femaleOnly) chips.push({ id: "female", label: "Só mulheres" });
  if (f.ageGroup) {
    chips.push({
      id: "age",
      label: AGE_GROUP_CHIP_LABELS[f.ageGroup],
    });
  }
  if (f.terrain) chips.push({ id: "terrain", label: `Terreno: ${f.terrain}` });

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
      return { ...f, onlyFuture: false };
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
    return true;
  });
}
