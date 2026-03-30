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
  const labels: string[] = [];
  if (f.maxDistanceKm !== DEFAULT_PEDAL_FILTERS.maxDistanceKm) {
    labels.push(`Até ${f.maxDistanceKm} km`);
  }
  if (f.difficulty) labels.push(`Dificuldade: ${f.difficulty}`);
  if (f.femaleOnly) labels.push("Só mulheres");
  if (f.ageGroup) labels.push(`Faixa: ${f.ageGroup}`);
  if (!f.onlyFuture) labels.push("Inclui passados");
  if (f.onlyWithSlots) labels.push("Com vagas");
  if (f.terrain) labels.push(`Terreno: ${f.terrain}`);
  return labels;
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
