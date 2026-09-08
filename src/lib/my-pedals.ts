import { supabase } from "./supabase";

export interface PedalSummary {
  id: string;
  name: string;
  date: string;
  max_participants: number | null;
  approvedCount: number;
  cover_image_url: string | null;
  status?: string;
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

type PedalRow = Pick<
  PedalSummary,
  "id" | "name" | "date" | "max_participants" | "cover_image_url"
> & { status?: string };

function withCounts(
  rows: PedalRow[],
  counts: Map<string, number>
): PedalSummary[] {
  return rows.map((r) => ({
    ...r,
    cover_image_url: r.cover_image_url ?? null,
    approvedCount: counts.get(r.id) ?? 0,
  }));
}

/**
 * Active lists exclude completed pedais. `completed` = user is creator or approved participant.
 */
export async function fetchMyPedalsLists(userId: string): Promise<{
  owned: PedalSummary[];
  participating: PedalSummary[];
  completed: PedalSummary[];
  error: Error | null;
}> {
  const [
    { data: ownedRows, error: ownedError },
    { data: ownedCompletedRows, error: ownedCompletedError },
    { data: partRows, error: partError },
  ] = await Promise.all([
    supabase
      .from("pedals")
      .select("id, name, date, max_participants, status, cover_image_url")
      .eq("creator_id", userId)
      .in("status", ["scheduled", "in_progress"])
      .order("date", { ascending: true }),
    supabase
      .from("pedals")
      .select("id, name, date, max_participants, status, cover_image_url")
      .eq("creator_id", userId)
      .eq("status", "completed")
      .order("date", { ascending: false }),
    supabase
      .from("pedal_participants")
      .select(
        `
      pedal_id,
      status,
      pedals (
        id,
        name,
        date,
        max_participants,
        creator_id,
        status,
        cover_image_url
      )
    `
      )
      .eq("user_id", userId)
      .neq("status", "rejected"),
  ]);

  if (ownedError || ownedCompletedError) {
    return {
      owned: [],
      participating: [],
      completed: [],
      error: ownedError ?? ownedCompletedError ?? new Error("fetch failed"),
    };
  }

  if (partError) {
    return {
      owned: [],
      participating: [],
      completed: [],
      error: partError,
    };
  }

  const owned = (ownedRows ?? []) as PedalRow[];

  const participatingRaw = (partRows ?? []) as {
    pedal_id: string;
    status: string;
    pedals:
      | {
          id: string;
          name: string;
          date: string;
          max_participants: number | null;
          creator_id: string;
          status: string;
          cover_image_url: string | null;
        }
      | {
          id: string;
          name: string;
          date: string;
          max_participants: number | null;
          creator_id: string;
          status: string;
          cover_image_url: string | null;
        }[]
      | null;
  }[];

  const participating: PedalRow[] = [];
  const participatingCompleted: PedalRow[] = [];

  for (const row of participatingRaw) {
    const p = Array.isArray(row.pedals) ? row.pedals[0] : row.pedals;
    if (!p) continue;
    if (p.creator_id === userId) continue;

    const rowData: PedalRow = {
      id: p.id,
      name: p.name,
      date: p.date,
      max_participants: p.max_participants,
      status: p.status,
      cover_image_url: p.cover_image_url ?? null,
    };

    if (p.status === "completed" && row.status === "approved") {
      participatingCompleted.push(rowData);
    } else if (
      (p.status === "scheduled" || p.status === "in_progress") &&
      row.status !== "rejected"
    ) {
      participating.push(rowData);
    }
  }

  participating.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const ownedCompleted = (ownedCompletedRows ?? []) as PedalRow[];

  const completedMap = new Map<string, PedalRow>();
  for (const r of ownedCompleted) {
    completedMap.set(r.id, r);
  }
  for (const r of participatingCompleted) {
    completedMap.set(r.id, r);
  }
  const completed = Array.from(completedMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const allIds = [
    ...new Set([
      ...owned.map((o) => o.id),
      ...participating.map((p) => p.id),
      ...completed.map((c) => c.id),
    ]),
  ];

  const counts = await approvedCountsByPedalId(allIds);

  return {
    owned: withCounts(owned, counts),
    participating: withCounts(participating, counts),
    completed: withCounts(completed, counts),
    error: null,
  };
}
