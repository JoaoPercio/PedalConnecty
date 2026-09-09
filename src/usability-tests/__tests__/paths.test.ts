import { describe, expect, it } from "vitest";
import { DEFAULT_PEDAL_FILTERS } from "@/lib/pedal-filters";
import { isPedalDetailsPath, shouldCompleteFilterTest } from "../paths";

describe("usability path helpers", () => {
  it("detects pedal detail routes and ignores list/create routes", () => {
    expect(isPedalDetailsPath(" /pedals/abc-123".trim())).toBe(true);
    expect(isPedalDetailsPath("/pedals/create")).toBe(false);
    expect(isPedalDetailsPath("/pedals/mine")).toBe(false);
    expect(isPedalDetailsPath("/pedals/entrar")).toBe(false);
    expect(isPedalDetailsPath("/pedals/abc/edit")).toBe(false);
    expect(isPedalDetailsPath("/home")).toBe(false);
  });

  it("requires a real filter change before completing test 3", () => {
    expect(shouldCompleteFilterTest(DEFAULT_PEDAL_FILTERS, true)).toBe(false);
    expect(
      shouldCompleteFilterTest(
        { ...DEFAULT_PEDAL_FILTERS, difficulty: "iniciante" },
        true
      )
    ).toBe(true);
    expect(
      shouldCompleteFilterTest(
        { ...DEFAULT_PEDAL_FILTERS, difficulty: "iniciante" },
        false
      )
    ).toBe(false);
  });
});
