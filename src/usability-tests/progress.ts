import { USABILITY_TEST_COUNT } from "./config";
import type {
  TestSessionView,
  UsabilityTestProgressRow,
  UsabilityTestSessionRow,
  UsabilityTestStatus,
} from "./types";

export function emptyProgressRows(
  userId: string,
  nowIso: string
): UsabilityTestProgressRow[] {
  return Array.from({ length: USABILITY_TEST_COUNT }, (_, i) => ({
    id: `local-${i + 1}`,
    user_id: userId,
    test_number: i + 1,
    status: (i === 0 ? "in_progress" : "pending") as UsabilityTestStatus,
    started_at: i === 0 ? nowIso : null,
    completed_at: null,
    updated_at: nowIso,
    metadata: {},
  }));
}

export function findCurrentTestNumber(
  rows: Pick<UsabilityTestProgressRow, "test_number" | "status">[]
): number | null {
  for (let n = 1; n <= USABILITY_TEST_COUNT; n++) {
    const row = rows.find((r) => r.test_number === n);
    if (!row) return n;
    if (row.status === "pending" || row.status === "in_progress") return n;
  }
  return null;
}

export function countByStatus(
  rows: Pick<UsabilityTestProgressRow, "status">[],
  status: UsabilityTestStatus
): number {
  return rows.filter((r) => r.status === status).length;
}

export function isSessionFinished(
  rows: Pick<UsabilityTestProgressRow, "status">[]
): boolean {
  if (rows.length < USABILITY_TEST_COUNT) return false;
  return rows.every(
    (r) => r.status === "completed" || r.status === "skipped"
  );
}

export function buildSessionView(
  rows: UsabilityTestProgressRow[],
  session: UsabilityTestSessionRow
): TestSessionView {
  const completedCount = countByStatus(rows, "completed");
  const skippedCount = countByStatus(rows, "skipped");
  return {
    rows,
    session: {
      ...session,
      completed_count: completedCount,
      skipped_count: skippedCount,
      finished_at: isSessionFinished(rows)
        ? session.finished_at ?? session.updated_at
        : null,
    },
    currentTestNumber: findCurrentTestNumber(rows),
    completedCount,
    skippedCount,
    finished: isSessionFinished(rows),
  };
}

export function applyTerminalStatus(
  row: UsabilityTestProgressRow,
  next: Extract<UsabilityTestStatus, "completed" | "skipped">,
  nowIso: string,
  extraMetadata: Record<string, unknown> = {}
): UsabilityTestProgressRow {
  if (row.status === "completed" || row.status === "skipped") {
    return row;
  }

  const startedAt = row.started_at ?? nowIso;
  const durationMs = new Date(nowIso).getTime() - new Date(startedAt).getTime();

  return {
    ...row,
    status: next,
    started_at: startedAt,
    completed_at: nowIso,
    updated_at: nowIso,
    metadata: {
      ...row.metadata,
      ...extraMetadata,
      duration_ms: durationMs >= 0 ? durationMs : 0,
    },
  };
}

export function markInProgress(
  row: UsabilityTestProgressRow,
  nowIso: string
): UsabilityTestProgressRow {
  if (row.status !== "pending") return row;
  return {
    ...row,
    status: "in_progress",
    started_at: row.started_at ?? nowIso,
    updated_at: nowIso,
  };
}

export function advanceInProgress(
  rows: UsabilityTestProgressRow[],
  nowIso: string
): UsabilityTestProgressRow[] {
  const current = findCurrentTestNumber(rows);
  if (current == null) return rows;
  return rows.map((r) =>
    r.test_number === current ? markInProgress(r, nowIso) : r
  );
}

export function isAccountRecentEnough(
  createdAtIso: string | undefined,
  nowMs: number,
  maxAgeMs: number
): boolean {
  if (!createdAtIso) return false;
  const created = new Date(createdAtIso).getTime();
  if (Number.isNaN(created)) return false;
  return nowMs - created >= 0 && nowMs - created <= maxAgeMs;
}
