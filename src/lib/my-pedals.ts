import { supabase } from "./supabase";

export interface PedalSummary {
  id: string;
  name: string;
  date: string;
  max_participants: number | null;
  approvedCount: number;
}

async function approvedCountsByPedalId(
  pedalIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (pedalIds.length === 0) return map;

  const { data, error } = await supabase
    .from("pedal_participants")
    .select("pedal_id")
    .in("pedal_id", pedalIds)
    .eq("status", "approved");

  if (error || !data) return map;

  for (const row of data as { pedal_id: string }[]) {
    map.set(row.pedal_id, (map.get(row.pedal_id) ?? 0) + 1);
  }
  return map;
}

export async function fetchMyPedalsLists(userId: string): Promise<{
  owned: PedalSummary[];
  participating: PedalSummary[];
  error: Error | null;
}> {
  const { data: ownedRows, error: ownedError } = await supabase
    .from("pedals")
    .select("id, name, date, max_participants")
    .eq("creator_id", userId)
    .order("date", { ascending: true });

  if (ownedError) {
    return {
      owned: [],
      participating: [],
      error: ownedError,
    };
  }

  const { data: partRows, error: partError } = await supabase
    .from("pedal_participants")
    .select(
      `
      pedal_id,
      pedals (
        id,
        name,
        date,
        max_participants,
        creator_id
      )
    `
    )
    .eq("user_id", userId)
    .neq("status", "rejected");

  if (partError) {
    return {
      owned: [],
      participating: [],
      error: partError,
    };
  }

  const owned = (ownedRows ?? []) as Pick<
    PedalSummary,
    "id" | "name" | "date" | "max_participants"
  >[];

  const participatingRaw = (partRows ?? []) as {
    pedal_id: string;
    pedals:
      | {
          id: string;
          name: string;
          date: string;
          max_participants: number | null;
          creator_id: string;
        }
      | {
          id: string;
          name: string;
          date: string;
          max_participants: number | null;
          creator_id: string;
        }[]
      | null;
  }[];

  const participating: Pick<
    PedalSummary,
    "id" | "name" | "date" | "max_participants"
  >[] = [];

  for (const row of participatingRaw) {
    const p = Array.isArray(row.pedals) ? row.pedals[0] : row.pedals;
    if (!p) continue;
    if (p.creator_id === userId) continue;
    participating.push({
      id: p.id,
      name: p.name,
      date: p.date,
      max_participants: p.max_participants,
    });
  }

  participating.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const allIds = [
    ...new Set([
      ...owned.map((o) => o.id),
      ...participating.map((p) => p.id),
    ]),
  ];

  const counts = await approvedCountsByPedalId(allIds);

  const withCounts = (
    rows: Pick<
      PedalSummary,
      "id" | "name" | "date" | "max_participants"
    >[]
  ): PedalSummary[] =>
    rows.map((r) => ({
      ...r,
      approvedCount: counts.get(r.id) ?? 0,
    }));

  return {
    owned: withCounts(owned),
    participating: withCounts(participating),
    error: null,
  };
}
