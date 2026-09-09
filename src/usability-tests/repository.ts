import { supabase } from "@/lib/supabase";
import type {
  UsabilityTestMetadata,
  UsabilityTestProgressRow,
  UsabilityTestSessionRow,
  UsabilityTestStatus,
} from "./types";

export interface TestProgressRepository {
  listProgress(userId: string): Promise<UsabilityTestProgressRow[]>;
  upsertProgress(row: UsabilityTestProgressRow): Promise<UsabilityTestProgressRow>;
  insertProgressMany(rows: UsabilityTestProgressRow[]): Promise<UsabilityTestProgressRow[]>;
  getSession(userId: string): Promise<UsabilityTestSessionRow | null>;
  upsertSession(row: UsabilityTestSessionRow): Promise<UsabilityTestSessionRow>;
}

function asMetadata(value: unknown): UsabilityTestMetadata {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as UsabilityTestMetadata;
  }
  return {};
}

function mapProgress(row: Record<string, unknown>): UsabilityTestProgressRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    test_number: Number(row.test_number),
    status: row.status as UsabilityTestStatus,
    started_at: (row.started_at as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    updated_at: String(row.updated_at),
    metadata: asMetadata(row.metadata),
  };
}

function mapSession(row: Record<string, unknown>): UsabilityTestSessionRow {
  return {
    user_id: String(row.user_id),
    started_at: String(row.started_at),
    finished_at: (row.finished_at as string | null) ?? null,
    completed_count: Number(row.completed_count ?? 0),
    skipped_count: Number(row.skipped_count ?? 0),
    updated_at: String(row.updated_at),
  };
}

export class SupabaseTestProgressRepository implements TestProgressRepository {
  async listProgress(userId: string): Promise<UsabilityTestProgressRow[]> {
    const { data, error } = await supabase
      .from("user_test_progress")
      .select(
        "id,user_id,test_number,status,started_at,completed_at,updated_at,metadata"
      )
      .eq("user_id", userId)
      .order("test_number", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r) => mapProgress(r as Record<string, unknown>));
  }

  async upsertProgress(
    row: UsabilityTestProgressRow
  ): Promise<UsabilityTestProgressRow> {
    const payload = {
      user_id: row.user_id,
      test_number: row.test_number,
      status: row.status,
      started_at: row.started_at,
      completed_at: row.completed_at,
      metadata: row.metadata,
    };

    const { data, error } = await supabase
      .from("user_test_progress")
      .upsert(payload, { onConflict: "user_id,test_number" })
      .select(
        "id,user_id,test_number,status,started_at,completed_at,updated_at,metadata"
      )
      .single();

    if (error || !data) throw error ?? new Error("Falha ao salvar progresso.");
    return mapProgress(data as Record<string, unknown>);
  }

  async insertProgressMany(
    rows: UsabilityTestProgressRow[]
  ): Promise<UsabilityTestProgressRow[]> {
    const payload = rows.map((row) => ({
      user_id: row.user_id,
      test_number: row.test_number,
      status: row.status,
      started_at: row.started_at,
      completed_at: row.completed_at,
      metadata: row.metadata,
    }));

    const { data, error } = await supabase
      .from("user_test_progress")
      .insert(payload)
      .select(
        "id,user_id,test_number,status,started_at,completed_at,updated_at,metadata"
      );

    if (error) throw error;
    return (data ?? []).map((r) => mapProgress(r as Record<string, unknown>));
  }

  async getSession(userId: string): Promise<UsabilityTestSessionRow | null> {
    const { data, error } = await supabase
      .from("user_test_sessions")
      .select(
        "user_id,started_at,finished_at,completed_count,skipped_count,updated_at"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapSession(data as Record<string, unknown>);
  }

  async upsertSession(
    row: UsabilityTestSessionRow
  ): Promise<UsabilityTestSessionRow> {
    const { data, error } = await supabase
      .from("user_test_sessions")
      .upsert(
        {
          user_id: row.user_id,
          started_at: row.started_at,
          finished_at: row.finished_at,
          completed_count: row.completed_count,
          skipped_count: row.skipped_count,
        },
        { onConflict: "user_id" }
      )
      .select(
        "user_id,started_at,finished_at,completed_count,skipped_count,updated_at"
      )
      .single();

    if (error || !data) throw error ?? new Error("Falha ao salvar sessão.");
    return mapSession(data as Record<string, unknown>);
  }
}
