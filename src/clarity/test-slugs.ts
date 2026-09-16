/** Stable slugs for Clarity.setTag("current_test"). Not product copy. */
export const USABILITY_TEST_SLUGS: Record<number, string> = {
  1: "signup",
  2: "create_pedal",
  3: "filter_pedals",
  4: "join_pedal",
  5: "pedal_chat",
  6: "pedal_details",
  7: "create_route",
  8: "favorite_route",
  9: "bike_service_map",
  10: "view_notification",
};

export function usabilityTestSlug(testNumber: number | null): string {
  if (testNumber == null) return "none";
  return USABILITY_TEST_SLUGS[testNumber] ?? `test_${testNumber}`;
}
