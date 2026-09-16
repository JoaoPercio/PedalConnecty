import type { ClarityConsentDecision } from "./types";

export const CLARITY_CONSENT_STORAGE_KEY = "pc_clarity_consent_v1";
export const CLARITY_PARTICIPANT_STORAGE_KEY = "pc_clarity_participant_id";

export function readClarityConsent(): ClarityConsentDecision | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLARITY_CONSENT_STORAGE_KEY);
    if (raw === "granted" || raw === "denied") return raw;
    return null;
  } catch {
    return null;
  }
}

export function writeClarityConsent(value: ClarityConsentDecision): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLARITY_CONSENT_STORAGE_KEY, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getOrCreateAnonymousParticipantId(): string {
  if (typeof window === "undefined") return "anonymous_ssr";
  try {
    const existing = window.localStorage.getItem(CLARITY_PARTICIPANT_STORAGE_KEY);
    if (existing && existing.length > 0) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `anon_${crypto.randomUUID()}`
        : `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(CLARITY_PARTICIPANT_STORAGE_KEY, next);
    return next;
  } catch {
    return `anon_session`;
  }
}
