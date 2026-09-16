import type { UsabilityEvent, UsabilityTestStatus } from "@/usability-tests/types";

export type ClarityConsentDecision = "granted" | "denied";

export interface ClaritySdk {
  init: (projectId: string) => void;
  setTag: (key: string, value: string | string[]) => void;
  identify: (
    customId: string,
    customSessionId?: string,
    customPageId?: string,
    friendlyName?: string
  ) => void;
  consentV2: (consentOptions?: {
    ad_Storage: "granted" | "denied";
    analytics_Storage: "granted" | "denied";
  }) => void;
  upgrade: (reason: string) => void;
  event: (eventName: string) => void;
}

export interface ClarityIdentifyArgs {
  customId: string;
}

export interface UsabilityClarityContext {
  participantId: string;
  currentTest: string;
  testNumber: number | null;
  testStatus: UsabilityTestStatus | "finished" | "guest";
}

export type { UsabilityEvent };
