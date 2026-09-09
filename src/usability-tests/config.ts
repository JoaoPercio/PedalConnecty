/**
 * Single switch for the temporary TCC usability-test module.
 * Set NEXT_PUBLIC_ENABLE_USABILITY_TESTS=false (or remove the UI host)
 * to disable without affecting PedalConnect features.
 */
export const ENABLE_USABILITY_TESTS =
  process.env.NEXT_PUBLIC_ENABLE_USABILITY_TESTS !== "false";

export const USABILITY_TEST_COUNT = 10;

export const PEDAL_DETAILS_VIEW_MS = 2000;

/** New accounts created within this window can auto-complete Test 1 after login. */
export const SIGNUP_TEST_ACCOUNT_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function isUsabilityTestsEnabled(): boolean {
  return ENABLE_USABILITY_TESTS;
}
