import type { FilterChip } from "@/lib/pedal-filters";

export function allCategoriesOn(
  value: Record<string, boolean>,
  keys: string[]
): boolean {
  return keys.every((k) => value[k]);
}

export function countActiveCategoryFilters(
  value: Record<string, boolean>,
  keys: string[]
): number {
  if (allCategoriesOn(value, keys)) return 0;
  return keys.filter((k) => !value[k]).length;
}

export function getCategoryFilterChips(
  value: Record<string, boolean>,
  options: { id: string; label: string }[]
): FilterChip[] {
  const keys = options.map((o) => o.id);
  if (allCategoriesOn(value, keys)) return [];
  return options
    .filter((o) => value[o.id])
    .map((o) => ({ id: o.id, label: o.label }));
}

export function removeCategoryFilterChip<T extends string>(
  value: Record<T, boolean>,
  chipId: string,
  keys: T[]
): Record<T, boolean> {
  if (!keys.includes(chipId as T)) return value;
  const next = { ...value, [chipId as T]: false };
  if (keys.every((k) => !next[k])) {
    return Object.fromEntries(keys.map((k) => [k, true])) as Record<T, boolean>;
  }
  return next;
}

export function allCategoriesSelected<T extends string>(
  keys: T[]
): Record<T, boolean> {
  return Object.fromEntries(keys.map((k) => [k, true])) as Record<T, boolean>;
}
