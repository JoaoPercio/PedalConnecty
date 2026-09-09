import { describe, expect, it } from "vitest";
import { InMemoryTestProgressRepository } from "../memory-repository";
import { TestSessionService } from "../service";

const USER = "user-1";

function createService(iso = "2026-09-07T12:00:00.000Z") {
  const repo = new InMemoryTestProgressRepository();
  let now = new Date(iso);
  const service = new TestSessionService(repo, () => now);
  return {
    repo,
    service,
    setNow(next: string) {
      now = new Date(next);
    },
  };
}

describe("TestSessionService", () => {
  it("creates a session with 10 tests and starts at test 1", async () => {
    const { service, repo } = createService();
    const state = await service.load(USER);
    expect(state.rows).toHaveLength(10);
    expect(state.currentTestNumber).toBe(1);
    expect(state.completedCount).toBe(0);
    expect(state.finished).toBe(false);
    expect(repo.sessions.get(USER)?.user_id).toBe(USER);
    expect(state.rows[0]?.status).toBe("in_progress");
  });

  it("completes the current test and advances", async () => {
    const { service } = createService();
    await service.load(USER);
    const result = await service.handleEvent(USER, {
      type: "account_registered",
    });
    expect(result.completedTestNumber).toBeNull();
    const signed = await service.handleEvent(USER, { type: "signed_in" });
    expect(signed.completedTestNumber).toBe(1);
    expect(signed.state.currentTestNumber).toBe(2);
    expect(signed.state.completedCount).toBe(1);
  });

  it("does not complete test 1 from login alone", async () => {
    const { service } = createService();
    const result = await service.handleEvent(USER, { type: "signed_in" });
    expect(result.completedTestNumber).toBeNull();
    expect(result.state.currentTestNumber).toBe(1);
  });

  it("ignores events that do not match the current test", async () => {
    const { service } = createService();
    await service.load(USER);
    const result = await service.handleEvent(USER, {
      type: "pedal_created",
      pedalId: "p1",
    });
    expect(result.completedTestNumber).toBeNull();
    expect(result.state.currentTestNumber).toBe(1);
  });

  it("is idempotent: repeating the same action keeps the original completed_at", async () => {
    const ctx = createService("2026-09-07T12:00:00.000Z");
    await ctx.service.handleEvent(USER, { type: "account_registered" });
    await ctx.service.handleEvent(USER, { type: "signed_in" });
    await ctx.service.handleEvent(USER, {
      type: "pedal_created",
      pedalId: "p1",
    });
    const first = ctx.repo.progress
      .get(USER)
      ?.find((r) => r.test_number === 2);
    expect(first?.completed_at).toBe("2026-09-07T12:00:00.000Z");

    ctx.setNow("2026-09-07T15:00:00.000Z");
    const again = await ctx.service.handleEvent(USER, {
      type: "pedal_created",
      pedalId: "p2",
    });
    expect(again.completedTestNumber).toBeNull();
    const second = ctx.repo.progress
      .get(USER)
      ?.find((r) => r.test_number === 2);
    expect(second?.status).toBe("completed");
    expect(second?.completed_at).toBe("2026-09-07T12:00:00.000Z");
    expect(second?.metadata.pedal_id).toBe("p1");
    expect(ctx.repo.progress.get(USER)?.filter((r) => r.test_number === 2)).toHaveLength(
      1
    );
  });

  it("marks the current test as skipped and advances", async () => {
    const { service } = createService();
    const skipped = await service.skipCurrent(USER);
    expect(skipped.state.rows[0]?.status).toBe("skipped");
    expect(skipped.state.currentTestNumber).toBe(2);
    expect(skipped.state.skippedCount).toBe(1);
    expect(skipped.state.rows[1]?.status).toBe("in_progress");
  });

  it("recovers progress from the repository on a new service instance", async () => {
    const { service, repo } = createService();
    await service.handleEvent(USER, { type: "account_registered" });
    await service.handleEvent(USER, { type: "signed_in" });
    await service.handleEvent(USER, { type: "pedal_created", pedalId: "p1" });

    const restored = new TestSessionService(repo, () => new Date("2026-09-08T00:00:00.000Z"));
    const state = await restored.load(USER);
    expect(state.completedCount).toBe(2);
    expect(state.currentTestNumber).toBe(3);
    expect(state.rows.find((r) => r.test_number === 1)?.status).toBe("completed");
  });

  it("computes finished state after 10 terminal results", async () => {
    const { service } = createService();
    for (let i = 0; i < 8; i++) {
      await service.skipCurrent(USER);
    }
    await service.skipCurrent(USER);
    const last = await service.skipCurrent(USER);
    expect(last.state.finished).toBe(true);
    expect(last.state.currentTestNumber).toBeNull();
    expect(last.state.skippedCount).toBe(10);
    expect(last.state.session.finished_at).toBeTruthy();
  });

  it("auto-completes test 1 for a recently created account after login", async () => {
    const { service } = createService("2026-09-07T12:00:00.000Z");
    const result = await service.tryCompleteSignupFromNewAccount(
      USER,
      "2026-09-07T11:00:00.000Z"
    );
    expect(result.completedTestNumber).toBe(1);
    expect(result.state.currentTestNumber).toBe(2);
  });

  it("does not auto-complete test 1 for an old account", async () => {
    const { service } = createService("2026-09-07T12:00:00.000Z");
    const result = await service.tryCompleteSignupFromNewAccount(
      USER,
      "2025-01-01T00:00:00.000Z"
    );
    expect(result.completedTestNumber).toBeNull();
    expect(result.state.currentTestNumber).toBe(1);
  });
});
