import { describe, expect, it } from "vitest";
import {
  applyTerminalStatus,
  countByStatus,
  findCurrentTestNumber,
  isAccountRecentEnough,
  isSessionFinished,
} from "../progress";
import type { UsabilityTestProgressRow } from "../types";

function row(
  n: number,
  status: UsabilityTestProgressRow["status"]
): UsabilityTestProgressRow {
  return {
    id: String(n),
    user_id: "u1",
    test_number: n,
    status,
    started_at: null,
    completed_at: null,
    updated_at: "2026-09-07T12:00:00.000Z",
    metadata: {},
  };
}

describe("progress helpers", () => {
  it("finds the first pending or in-progress test", () => {
    const rows = [
      row(1, "completed"),
      row(2, "skipped"),
      row(3, "in_progress"),
      row(4, "pending"),
    ];
    expect(findCurrentTestNumber(rows)).toBe(3);
  });

  it("returns null when every test is terminal", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row(i + 1, i < 8 ? "completed" : "skipped")
    );
    expect(findCurrentTestNumber(rows)).toBeNull();
    expect(isSessionFinished(rows)).toBe(true);
    expect(countByStatus(rows, "completed")).toBe(8);
    expect(countByStatus(rows, "skipped")).toBe(2);
  });

  it("does not treat opening progress as finished", () => {
    expect(isSessionFinished([row(1, "in_progress")])).toBe(false);
  });

  it("keeps original completion when applying terminal status twice", () => {
    const first = applyTerminalStatus(
      row(2, "in_progress"),
      "completed",
      "2026-09-07T12:01:00.000Z",
      { pedal_id: "p1" }
    );
    const second = applyTerminalStatus(
      first,
      "completed",
      "2026-09-07T12:10:00.000Z",
      { pedal_id: "p2" }
    );
    expect(second.completed_at).toBe("2026-09-07T12:01:00.000Z");
    expect(second.metadata.pedal_id).toBe("p1");
  });

  it("detects recent accounts only within the max age window", () => {
    const now = Date.parse("2026-09-07T12:00:00.000Z");
    expect(
      isAccountRecentEnough("2026-09-07T10:00:00.000Z", now, 48 * 3600 * 1000)
    ).toBe(true);
    expect(
      isAccountRecentEnough("2026-08-01T10:00:00.000Z", now, 48 * 3600 * 1000)
    ).toBe(false);
  });
});
