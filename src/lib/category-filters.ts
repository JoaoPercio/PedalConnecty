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

export function allCategoriesSelected<T extends string>(
  keys: T[]
): Record<T, boolean> {
  return Object.fromEntries(keys.map((k) => [k, true])) as Record<T, boolean>;
}
