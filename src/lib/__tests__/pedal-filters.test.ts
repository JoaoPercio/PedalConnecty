import { describe, expect, it } from "vitest";
import {
  applyPedalFilters,
  chipCoveredByQuickFilter,
  countActiveFilters,
  DEFAULT_PEDAL_FILTERS,
  getFilterChips,
  QUICK_FILTERS,
  removeFilterChip,
  type EnrichedNearbyPedal,
} from "../pedal-filters";
import { formatPinLabel } from "../pedal-display";

function pedal(id: string, date: Date, extra: Partial<EnrichedNearbyPedal> = {}): EnrichedNearbyPedal {
  return {
    id,
    name: id,
    date: date.toISOString(),
    distance_km: 10,
    difficulty: "iniciante",
    terrain: "asfalto",
    age_group: "todas",
    visibility: "public",
    max_participants: null,
    cover_image_url: null,
    start_lat: 0,
    start_lng: 0,
    computedDistanceKm: 5,
    approved_count: 0,
    ...extra,
  };
}

// Quarta-feira, 21/10/2026, 10:00 (horário local).
const NOW = new Date(2026, 9, 21, 10, 0);

describe("pedal filters", () => {
  it("filtros padrão não geram chips removíveis", () => {
    expect(getFilterChips(DEFAULT_PEDAL_FILTERS)).toEqual([]);
    expect(countActiveFilters(DEFAULT_PEDAL_FILTERS)).toBe(0);
  });

  it("'Hoje' mantém só pedais de hoje", () => {
    const rows = [
      pedal("hoje", new Date(2026, 9, 21, 18, 0)),
      pedal("amanha", new Date(2026, 9, 22, 8, 0)),
    ];
    const out = applyPedalFilters(rows, { ...DEFAULT_PEDAL_FILTERS, when: "today" }, NOW);
    expect(out.map((p) => p.id)).toEqual(["hoje"]);
  });

  it("'Fim de semana' pega sábado e domingo seguintes", () => {
    const rows = [
      pedal("sexta", new Date(2026, 9, 23, 18, 0)),
      pedal("sabado", new Date(2026, 9, 24, 7, 0)),
      pedal("domingo", new Date(2026, 9, 25, 20, 0)),
      pedal("segunda", new Date(2026, 9, 26, 7, 0)),
    ];
    const out = applyPedalFilters(rows, { ...DEFAULT_PEDAL_FILTERS, when: "weekend" }, NOW);
    expect(out.map((p) => p.id)).toEqual(["sabado", "domingo"]);
  });

  it("atalhos ligam e desligam, e contam como filtro ativo", () => {
    const trail = QUICK_FILTERS.find((q) => q.id === "trail")!;
    const on = trail.toggle(DEFAULT_PEDAL_FILTERS);
    expect(on.terrain).toBe("trilha");
    expect(trail.isActive(on)).toBe(true);
    expect(countActiveFilters(on)).toBe(1);
    expect(trail.toggle(on).terrain).toBe("");
  });

  it("chip de atalho não se repete como chip '×'; os demais sim", () => {
    const f = { ...DEFAULT_PEDAL_FILTERS, terrain: "trilha" as const, maxDistanceKm: 50 };
    const extras = getFilterChips(f).filter((c) => !chipCoveredByQuickFilter(c, f));
    expect(extras.map((c) => c.id)).toEqual(["distance"]);
    expect(removeFilterChip(f, "distance").maxDistanceKm).toBe(DEFAULT_PEDAL_FILTERS.maxDistanceKm);
  });

  it("rótulo do pin: hoje, amanhã, dia da semana e data", () => {
    expect(formatPinLabel(new Date(2026, 9, 21, 17, 39).toISOString(), NOW)).toBe("Hoje 17:39");
    expect(formatPinLabel(new Date(2026, 9, 22, 8, 0).toISOString(), NOW)).toBe("Amanhã 08:00");
    expect(formatPinLabel(new Date(2026, 9, 24, 7, 30).toISOString(), NOW)).toBe("Sáb 07:30");
    expect(formatPinLabel(new Date(2026, 10, 5, 7, 30).toISOString(), NOW)).toBe("05/11");
  });
});
