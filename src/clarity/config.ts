/**
 * Feature flag for Microsoft Clarity (TCC session recordings).
 * Opt-in: set NEXT_PUBLIC_ENABLE_CLARITY=true to activate.
 * Remove this module later without touching PedalConnect features.
 */
export function getClarityProjectId(): string {
  return (process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "").trim();
}

export function isClarityEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_CLARITY === "true";
}

export function isClarityRuntimeActive(): boolean {
  return isClarityEnabled() && getClarityProjectId().length > 0;
}

export function isDevelopmentEnv(): boolean {
  return process.env.NODE_ENV === "development";
}
