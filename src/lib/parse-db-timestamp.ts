/**
 * Parse timestamps from Postgres/Supabase (`timestamptz`).
 * Values without an explicit offset are sent as UTC wall time; ECMAScript would
 * otherwise treat them as local time and shift the instant (~3h in Brazil).
 *
 * Must run **before** appending `Z`: strings with `+00:00` / `Z` must use
 * `new Date` directly (regex is anchored to full string).
 */
function hasExplicitUtcOffset(s: string): boolean {
  if (/[zZ]$/.test(s)) return true;
  return (
    /[+-]\d{2}:\d{2}$/.test(s) ||
    /[+-]\d{4}$/.test(s) ||
    /[+-]\d{2}$/.test(s)
  );
}

const ISO_WALL_CLOCK_NO_OFFSET =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(\.\d+)?$/;

export function parseDbTimestamp(input: string): Date {
  const s = input.trim();
  if (!s) return new Date(NaN);
  if (hasExplicitUtcOffset(s)) {
    return new Date(s);
  }
  if (ISO_WALL_CLOCK_NO_OFFSET.test(s)) {
    return new Date(s.replace(" ", "T") + "Z");
  }
  return new Date(s);
}
