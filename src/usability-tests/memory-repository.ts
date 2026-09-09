import type {
  UsabilityTestProgressRow,
  UsabilityTestSessionRow,
} from "./types";
import type { TestProgressRepository } from "./repository";

export class InMemoryTestProgressRepository implements TestProgressRepository {
  progress = new Map<string, UsabilityTestProgressRow[]>();
  sessions = new Map<string, UsabilityTestSessionRow>();

  async listProgress(userId: string): Promise<UsabilityTestProgressRow[]> {
    return [...(this.progress.get(userId) ?? [])];
  }

  async upsertProgress(
    row: UsabilityTestProgressRow
  ): Promise<UsabilityTestProgressRow> {
    const list = this.progress.get(row.user_id) ?? [];
    const idx = list.findIndex((r) => r.test_number === row.test_number);
    const next = { ...row, id: row.id || `mem-${row.test_number}` };
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    list.sort((a, b) => a.test_number - b.test_number);
    this.progress.set(row.user_id, list);
    return next;
  }

  async insertProgressMany(
    rows: UsabilityTestProgressRow[]
  ): Promise<UsabilityTestProgressRow[]> {
    const saved: UsabilityTestProgressRow[] = [];
    for (const row of rows) {
      saved.push(await this.upsertProgress(row));
    }
    return saved;
  }

  async getSession(userId: string): Promise<UsabilityTestSessionRow | null> {
    return this.sessions.get(userId) ?? null;
  }

  async upsertSession(
    row: UsabilityTestSessionRow
  ): Promise<UsabilityTestSessionRow> {
    this.sessions.set(row.user_id, row);
    return row;
  }
}
