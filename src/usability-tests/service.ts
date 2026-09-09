import { SIGNUP_TEST_ACCOUNT_MAX_AGE_MS } from "./config";
import { getUsabilityTestById } from "./catalog";
import {
  advanceInProgress,
  applyTerminalStatus,
  buildSessionView,
  emptyProgressRows,
  findCurrentTestNumber,
  isAccountRecentEnough,
  isSessionFinished,
} from "./progress";
import type { TestProgressRepository } from "./repository";
import {
  EVENT_TEST_NUMBER,
  type HandleEventResult,
  type TestSessionView,
  type UsabilityEvent,
  type UsabilityTestMetadata,
  type UsabilityTestProgressRow,
  type UsabilityTestSessionRow,
} from "./types";

function eventMetadata(event: UsabilityEvent): UsabilityTestMetadata {
  switch (event.type) {
    case "account_registered":
      return { registered: true };
    case "signed_in":
      return { signed_in: true };
    case "pedal_created":
      return { pedal_id: event.pedalId };
    case "pedal_filters_used":
      return { filters: event.filters, result_count: event.resultCount };
    case "pedal_join_requested":
      return { pedal_id: event.pedalId };
    case "pedal_message_sent":
      return { pedal_id: event.pedalId };
    case "pedal_details_viewed":
      return { pedal_id: event.pedalId };
    case "route_created":
      return { route_id: event.routeId };
    case "route_favorited":
      return { route_id: event.routeId };
    case "bike_service_viewed":
      return { place_id: event.placeId, place_name: event.placeName };
    case "notification_viewed":
      return { notification_id: event.notificationId };
  }
}

export class TestSessionService {
  constructor(
    private readonly repo: TestProgressRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  private nowIso(): string {
    return this.now().toISOString();
  }

  async load(userId: string): Promise<TestSessionView> {
    const nowIso = this.nowIso();
    let rows = await this.repo.listProgress(userId);
    let session = await this.repo.getSession(userId);

    if (rows.length === 0) {
      const seed = emptyProgressRows(userId, nowIso).map((r) => ({
        ...r,
        id: "",
      }));
      try {
        rows = await this.repo.insertProgressMany(seed);
      } catch {
        rows = await this.repo.listProgress(userId);
      }
    }

    if (!session) {
      session = await this.repo.upsertSession({
        user_id: userId,
        started_at: nowIso,
        finished_at: null,
        completed_count: 0,
        skipped_count: 0,
        updated_at: nowIso,
      });
    }

    rows = advanceInProgress(rows, nowIso);
    const inProgress = rows.find((r) => r.status === "in_progress");
    if (inProgress) {
      await this.repo.upsertProgress(inProgress);
    }

    const view = buildSessionView(rows, session);
    session = await this.syncSessionCounts(userId, view);
    return buildSessionView(view.rows, session);
  }

  async tryCompleteSignupFromNewAccount(
    userId: string,
    userCreatedAt?: string
  ): Promise<HandleEventResult> {
    const view = await this.load(userId);
    if (view.currentTestNumber !== 1) {
      return { state: view, completedTestNumber: null, alreadyCompleted: false };
    }
    if (
      !isAccountRecentEnough(
        userCreatedAt,
        this.now().getTime(),
        SIGNUP_TEST_ACCOUNT_MAX_AGE_MS
      )
    ) {
      return { state: view, completedTestNumber: null, alreadyCompleted: false };
    }
    return this.completeCurrent(userId, {
      registered: true,
      signed_in: true,
      auto_from_recent_account: true,
    });
  }

  async handleEvent(
    userId: string,
    event: UsabilityEvent
  ): Promise<HandleEventResult> {
    const view = await this.load(userId);
    const target = EVENT_TEST_NUMBER[event.type];
    const meta = eventMetadata(event);

    if (target === 1) {
      return this.handleSignupEvent(userId, view, meta);
    }

    const current = view.currentTestNumber;
    if (current !== target) {
      return { state: view, completedTestNumber: null, alreadyCompleted: false };
    }

    const currentRow = view.rows.find((r) => r.test_number === current);
    if (
      currentRow?.status === "completed" ||
      currentRow?.status === "skipped"
    ) {
      return { state: view, completedTestNumber: null, alreadyCompleted: true };
    }

    return this.completeCurrent(userId, meta);
  }

  async skipCurrent(userId: string): Promise<HandleEventResult> {
    const view = await this.load(userId);
    const current = view.currentTestNumber;
    if (current == null) {
      return { state: view, completedTestNumber: null, alreadyCompleted: false };
    }

    const row = view.rows.find((r) => r.test_number === current);
    if (!row) {
      return { state: view, completedTestNumber: null, alreadyCompleted: false };
    }
    if (row.status === "completed" || row.status === "skipped") {
      return { state: view, completedTestNumber: null, alreadyCompleted: true };
    }

    const nowIso = this.nowIso();
    const updated = applyTerminalStatus(row, "skipped", nowIso);
    await this.repo.upsertProgress(updated);

    const rows = advanceInProgress(
      view.rows.map((r) => (r.test_number === current ? updated : r)),
      nowIso
    );
    const nextNumber = findCurrentTestNumber(rows);
    const next = rows.find((r) => r.test_number === nextNumber);
    if (next && next.status === "in_progress") {
      await this.repo.upsertProgress(next);
    }

    const nextView = buildSessionView(rows, view.session);
    const session = await this.syncSessionCounts(userId, nextView);
    return {
      state: buildSessionView(rows, session),
      completedTestNumber: null,
      alreadyCompleted: false,
    };
  }

  private async handleSignupEvent(
    userId: string,
    view: TestSessionView,
    meta: UsabilityTestMetadata
  ): Promise<HandleEventResult> {
    const row = view.rows.find((r) => r.test_number === 1);
    if (!row) {
      return { state: view, completedTestNumber: null, alreadyCompleted: false };
    }
    if (row.status === "completed" || row.status === "skipped") {
      return { state: view, completedTestNumber: null, alreadyCompleted: true };
    }
    if (view.currentTestNumber !== 1) {
      return { state: view, completedTestNumber: null, alreadyCompleted: false };
    }

    const merged: UsabilityTestMetadata = { ...row.metadata, ...meta };
    const nowIso = this.nowIso();
    const withMeta: UsabilityTestProgressRow = {
      ...row,
      metadata: merged,
      status: "in_progress",
      started_at: row.started_at ?? nowIso,
      updated_at: nowIso,
    };
    await this.repo.upsertProgress(withMeta);

    if (Boolean(merged.registered) && Boolean(merged.signed_in)) {
      return this.completeCurrent(userId, merged);
    }

    const rows = view.rows.map((r) => (r.test_number === 1 ? withMeta : r));
    return {
      state: buildSessionView(rows, view.session),
      completedTestNumber: null,
      alreadyCompleted: false,
    };
  }

  private async completeCurrent(
    userId: string,
    extraMetadata: UsabilityTestMetadata
  ): Promise<HandleEventResult> {
    const nowIso = this.nowIso();
    const listed = await this.repo.listProgress(userId);
    const session = await this.repo.getSession(userId);
    if (!session) {
      throw new Error("Sessão de testes não encontrada.");
    }

    const current = findCurrentTestNumber(listed);
    if (current == null) {
      return {
        state: buildSessionView(listed, session),
        completedTestNumber: null,
        alreadyCompleted: true,
      };
    }

    const row = listed.find((r) => r.test_number === current);
    if (!row) {
      return {
        state: buildSessionView(listed, session),
        completedTestNumber: null,
        alreadyCompleted: false,
      };
    }

    if (row.status === "completed" || row.status === "skipped") {
      return {
        state: buildSessionView(listed, session),
        completedTestNumber: null,
        alreadyCompleted: true,
      };
    }

    const updated = applyTerminalStatus(row, "completed", nowIso, extraMetadata);
    await this.repo.upsertProgress(updated);

    let rows = listed.map((r) => (r.test_number === current ? updated : r));
    rows = advanceInProgress(rows, nowIso);
    const nextNumber = findCurrentTestNumber(rows);
    const next = rows.find((r) => r.test_number === nextNumber);
    if (next && next.test_number !== current) {
      await this.repo.upsertProgress(next);
    }

    const view = buildSessionView(rows, session);
    const synced = await this.syncSessionCounts(userId, view);
    return {
      state: buildSessionView(rows, synced),
      completedTestNumber: current,
      alreadyCompleted: false,
    };
  }

  private async syncSessionCounts(
    userId: string,
    view: TestSessionView
  ): Promise<UsabilityTestSessionRow> {
    const nowIso = this.nowIso();
    const finished = isSessionFinished(view.rows);
    const next: UsabilityTestSessionRow = {
      ...view.session,
      user_id: userId,
      completed_count: view.completedCount,
      skipped_count: view.skippedCount,
      finished_at: finished ? view.session.finished_at ?? nowIso : null,
      updated_at: nowIso,
    };
    return this.repo.upsertSession(next);
  }
}

export function nextTestTitle(state: TestSessionView): string | null {
  if (state.currentTestNumber == null) return null;
  return getUsabilityTestById(state.currentTestNumber)?.title ?? null;
}

export { EVENT_TEST_NUMBER };
