import { supabase } from "./supabase";
import type {
  ApprovedParticipant,
  PedalMessageRow,
  PedalParticipantRow,
  PedalParticipantStatus,
  ParticipantProfile,
  PendingParticipantRow,
} from "@/types/pedal-details";

function singleProfile<T extends { profiles?: ParticipantProfile | ParticipantProfile[] | null }>(
  row: T
): ParticipantProfile | null {
  const p = row.profiles;
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export async function fetchMyParticipation(
  pedalId: string,
  userId: string
): Promise<PedalParticipantRow | null> {
  const { data, error } = await supabase
    .from("pedal_participants")
    .select("id, pedal_id, user_id, status")
    .eq("pedal_id", pedalId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PedalParticipantRow;
}

export async function requestJoinPedal(
  pedalId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const { data: existing, error: findError } = await supabase
    .from("pedal_participants")
    .select("id, status")
    .eq("pedal_id", pedalId)
    .eq("user_id", userId)
    .maybeSingle();

  if (findError) return { error: findError };

  if (existing) {
    if (existing.status === "approved") return { error: null };
    const { error } = await supabase
      .from("pedal_participants")
      .update({ status: "pending" })
      .eq("id", existing.id);
    return { error: error ?? null };
  }

  const { error } = await supabase.from("pedal_participants").insert({
    pedal_id: pedalId,
    user_id: userId,
    status: "pending",
  });
  return { error: error ?? null };
}

export async function fetchApprovedParticipants(
  pedalId: string
): Promise<{ rows: ApprovedParticipant[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("pedal_participants")
    .select(
      `
      id,
      pedal_id,
      user_id,
      status,
      profiles (
        id,
        first_name,
        last_name,
        avatar_url,
        city,
        gender,
        skill_level
      )
    `
    )
    .eq("pedal_id", pedalId)
    .eq("status", "approved");

  if (error) return { rows: [], error };
  return { rows: (data ?? []) as ApprovedParticipant[], error: null };
}

export async function fetchPendingParticipants(
  pedalId: string
): Promise<{ rows: PendingParticipantRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("pedal_participants")
    .select(
      `
      id,
      pedal_id,
      user_id,
      status,
      profiles (
        id,
        first_name,
        last_name,
        avatar_url,
        city,
        gender,
        skill_level,
        birth_date
      )
    `
    )
    .eq("pedal_id", pedalId)
    .eq("status", "pending");

  if (error) return { rows: [], error };
  return { rows: (data ?? []) as PendingParticipantRow[], error: null };
}

export async function updateParticipantStatus(
  participantRowId: string,
  status: Extract<PedalParticipantStatus, "approved" | "rejected">
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("pedal_participants")
    .update({ status })
    .eq("id", participantRowId);
  return { error: error ?? null };
}

export async function fetchPedalMessages(
  pedalId: string
): Promise<{ messages: PedalMessageRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("pedal_messages")
    .select(
      `
      id,
      pedal_id,
      user_id,
      message,
      created_at,
      profiles (
        first_name,
        last_name,
        avatar_url
      )
    `
    )
    .eq("pedal_id", pedalId)
    .order("created_at", { ascending: true });

  if (error) return { messages: [], error };
  return { messages: (data ?? []) as PedalMessageRow[], error: null };
}

export async function sendPedalMessage(
  pedalId: string,
  userId: string,
  message: string
): Promise<{ error: Error | null }> {
  const trimmed = message.trim();
  if (!trimmed) return { error: new Error("Mensagem vazia") };

  const { error } = await supabase.from("pedal_messages").insert({
    pedal_id: pedalId,
    user_id: userId,
    message: trimmed,
  });
  return { error: error ?? null };
}

export function displayNameFromMessage(row: PedalMessageRow): string {
  const raw = row.profiles;
  const p = !raw ? null : Array.isArray(raw) ? raw[0] : raw;
  if (!p) return "Usuário";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || "Usuário";
}

export function displayNameFromParticipant(row: ApprovedParticipant | PendingParticipantRow): string {
  const prof = singleProfile(row);
  if (!prof) return "Usuário";
  const name = [prof.first_name, prof.last_name].filter(Boolean).join(" ").trim();
  return name || "Usuário";
}

export { singleProfile };
