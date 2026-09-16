import Clarity from "@microsoft/clarity";
import {
  getClarityProjectId,
  isClarityEnabled,
  isClarityRuntimeActive,
  isDevelopmentEnv,
} from "./config";
import { getOrCreateAnonymousParticipantId } from "./consent-storage";
import { buildClarityIdentifyArgs } from "./privacy";
import type {
  ClaritySdk,
  UsabilityClarityContext,
  UsabilityEvent,
} from "./types";

const officialSdk: ClaritySdk = {
  init: (projectId) => Clarity.init(projectId),
  setTag: (key, value) => Clarity.setTag(key, value),
  identify: (customId, customSessionId, customPageId, friendlyName) =>
    Clarity.identify(customId, customSessionId, customPageId, friendlyName),
  consentV2: (options) => Clarity.consentV2(options),
  upgrade: (reason) => Clarity.upgrade(reason),
  event: (eventName) => Clarity.event(eventName),
};

type QueuedOp = () => void;

export class ClarityService {
  private initialized = false;
  private consentDenied = false;
  private queue: QueuedOp[] = [];

  constructor(
    private readonly sdk: ClaritySdk = officialSdk,
    private readonly env: {
      enabled: () => boolean;
      projectId: () => string;
      isDev: () => boolean;
    } = {
      enabled: isClarityEnabled,
      projectId: getClarityProjectId,
      isDev: isDevelopmentEnv,
    }
  ) {}

  isInitialized(): boolean {
    return this.initialized;
  }

  init(): boolean {
    if (!this.env.enabled()) return false;
    const projectId = this.env.projectId();
    if (!projectId) {
      if (this.env.isDev()) {
        console.warn(
          "[Clarity] NEXT_PUBLIC_CLARITY_PROJECT_ID ausente. Telemetria desligada."
        );
      }
      return false;
    }
    if (this.consentDenied) return false;
    if (this.initialized) return true;
    this.sdk.init(projectId);
    this.initialized = true;
    this.flushQueue();
    return true;
  }

  denyConsent(): void {
    this.consentDenied = true;
    this.queue = [];
  }

  grantAnalyticsConsent(): void {
    this.consentDenied = false;
    this.init();
    this.run(() =>
      this.sdk.consentV2({
        ad_Storage: "denied",
        analytics_Storage: "granted",
      })
    );
  }

  identifyUser(userId: string): void {
    const { customId } = buildClarityIdentifyArgs(userId);
    this.run(() => this.sdk.identify(customId));
  }

  identifyAnonymous(): void {
    const customId = getOrCreateAnonymousParticipantId();
    const { customId: safeId } = buildClarityIdentifyArgs(customId);
    this.run(() => this.sdk.identify(safeId));
  }

  getParticipantId(userId?: string | null): string {
    if (userId) return userId;
    return getOrCreateAnonymousParticipantId();
  }

  setTestContext(ctx: UsabilityClarityContext): void {
    this.run(() => {
      this.sdk.setTag("participant_id", ctx.participantId);
      this.sdk.setTag("current_test", ctx.currentTest);
      this.sdk.setTag(
        "test_number",
        ctx.testNumber == null ? "none" : String(ctx.testNumber)
      );
      this.sdk.setTag("test_status", ctx.testStatus);
    });
  }

  trackUsabilityEvent(event: UsabilityEvent): void {
    this.run(() => this.sdk.event(event.type));
  }

  trackTestCompleted(testNumber: number): void {
    this.run(() => {
      this.sdk.event("usability_test_completed");
      this.sdk.setTag("last_completed_test", String(testNumber));
      this.sdk.upgrade("usability_test_completed");
    });
  }

  private run(op: QueuedOp): void {
    if (this.consentDenied) return;
    if (!this.env.enabled()) return;
    if (!this.env.projectId()) return;
    if (!this.initialized) {
      this.queue.push(op);
      return;
    }
    op();
  }

  private flushQueue(): void {
    const pending = this.queue.splice(0, this.queue.length);
    for (const op of pending) op();
  }
}

let singleton: ClarityService | null = null;

export function getClarityService(): ClarityService {
  if (!singleton) singleton = new ClarityService();
  return singleton;
}

export function resetClarityServiceForTests(
  service?: ClarityService | null
): void {
  singleton = service ?? null;
}

export function canStartClarity(): boolean {
  return isClarityRuntimeActive();
}
