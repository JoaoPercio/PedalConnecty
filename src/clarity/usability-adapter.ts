import { getClarityService } from "./service";
import { usabilityTestSlug } from "./test-slugs";
import type {
  HandleEventResult,
  TestSessionView,
  UsabilityEvent,
} from "@/usability-tests/types";

/**
 * Thin, removable bridge: TestSessionService stays the source of truth.
 * Clarity only observes context already computed by the usability module.
 */
export function syncClarityUsabilityContext(input: {
  userId: string | null;
  guest: boolean;
  state: TestSessionView | null;
}): void {
  const clarity = getClarityService();
  if (input.guest) {
    const participantId = clarity.getParticipantId(null);
    clarity.identifyAnonymous();
    clarity.setTestContext({
      participantId,
      currentTest: usabilityTestSlug(1),
      testNumber: 1,
      testStatus: "guest",
    });
    return;
  }

  if (!input.userId || !input.state) return;

  clarity.identifyUser(input.userId);
  const n = input.state.currentTestNumber;
  const row = n
    ? input.state.rows.find((r) => r.test_number === n)
    : undefined;
  clarity.setTestContext({
    participantId: input.userId,
    currentTest: usabilityTestSlug(n),
    testNumber: n,
    testStatus: input.state.finished
      ? "finished"
      : (row?.status ?? "pending"),
  });
}

export function notifyClarityTestCompleted(testNumber: number): void {
  getClarityService().trackTestCompleted(testNumber);
}

export function reportUsabilityActionToClarity(event: UsabilityEvent): void {
  getClarityService().trackUsabilityEvent(event);
}

export function reportUsabilityHandleResultToClarity(
  userId: string,
  result: HandleEventResult
): void {
  syncClarityUsabilityContext({
    userId,
    guest: false,
    state: result.state,
  });
  if (result.completedTestNumber != null) {
    notifyClarityTestCompleted(result.completedTestNumber);
  }
}

