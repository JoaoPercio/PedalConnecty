import { reportUsabilityEvent } from "@/usability-tests";
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

/**
 * Only the creator can start; DB update is constrained to status = scheduled.
 */
export async function startPedalAsCreator(
  pedalId: string,
  creatorId: string
): Promise<{ error: Error | null }> {
  const { data, error } = await supabase
    .from("pedals")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .eq("id", pedalId)
    .eq("creator_id", creatorId)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();

  if (error) return { error };
  if (!data) {
    return {
      error: new Error(
        "Só é possível iniciar um pedal agendado, e apenas o organizador pode fazer isso."
      ),
    };
  }
  return { error: null };
}

/**
 * Only the creator can finish; DB update is constrained to status = in_progress.
 */
export async function completePedalAsCreator(
  pedalId: string,
  creatorId: string
): Promise<{ error: Error | null }> {
  const { data, error } = await supabase
    .from("pedals")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
    })
    .eq("id", pedalId)
    .eq("creator_id", creatorId)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();

  if (error) return { error };
  if (!data) {
    return {
      error: new Error(
        "Só é possível finalizar um pedal em andamento, e apenas o organizador pode fazer isso."
      ),
    };
  }
  return { error: null };
}

/**
 * Only the creator can cancel; allowed while status is still scheduled.
 */
export async function cancelPedalAsCreator(
  pedalId: string,
  creatorId: string
): Promise<{ error: Error | null }> {
  const { data, error } = await supabase
    .from("pedals")
    .update({ status: "cancelled" })
    .eq("id", pedalId)
    .eq("creator_id", creatorId)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();

  if (error) return { error };
  if (!data) {
    return {
      error: new Error(
        "Só é possível cancelar um pedal agendado, e apenas o organizador pode fazer isso."
      ),
    };
  }
  return { error: null };
}

/**
 * Participant leaves before start: removes their row. Not allowed for the organizer.
 */
export async function withdrawFromPedalBeforeStart(
  pedalId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const { data: pedal, error: pedalError } = await supabase
    .from("pedals")
    .select("id, status, creator_id")
    .eq("id", pedalId)
    .maybeSingle();

  if (pedalError) return { error: pedalError };
  if (!pedal) return { error: new Error("Pedal não encontrado.") };
  if (pedal.status !== "scheduled") {
    return {
      error: new Error("Só é possível sair enquanto o pedal ainda não foi iniciado."),
    };
  }
  if (pedal.creator_id === userId) {
    return {
      error: new Error(
        "O organizador não pode sair como participante. Cancele o pedal se não for mais realizar."
      ),
    };
  }

  const { error } = await supabase
    .from("pedal_participants")
    .delete()
    .eq("pedal_id", pedalId)
    .eq("user_id", userId);

  return { error: error ?? null };
}

/**
 * Organizer removes an approved (or other) participant row while the pedal is scheduled.
 * Cannot remove the organizer's own row.
 */
export async function removeParticipantAsOrganizer(
  pedalId: string,
  organizerId: string,
  participantRowId: string
): Promise<{ error: Error | null }> {
  const { data: pedal, error: pedalError } = await supabase
    .from("pedals")
    .select("id, status, creator_id")
    .eq("id", pedalId)
    .maybeSingle();

  if (pedalError) return { error: pedalError };
  if (!pedal) return { error: new Error("Pedal não encontrado.") };
  if (pedal.creator_id !== organizerId) {
    return { error: new Error("Apenas o organizador pode remover participantes.") };
  }
  if (pedal.status !== "scheduled") {
    return {
      error: new Error(
        "Só é possível remover participantes enquanto o pedal está agendado."
      ),
    };
  }

  const { data: row, error: rowError } = await supabase
    .from("pedal_participants")
    .select("id, user_id")
    .eq("id", participantRowId)
    .eq("pedal_id", pedalId)
    .maybeSingle();

  if (rowError) return { error: rowError };
  if (!row) return { error: new Error("Participante não encontrado.") };
  if (row.user_id === organizerId) {
    return {
      error: new Error(
        "O organizador não pode remover-se da lista de participantes."
      ),
    };
  }

  const { error } = await supabase
    .from("pedal_participants")
    .delete()
    .eq("id", participantRowId)
    .eq("pedal_id", pedalId);

  return { error: error ?? null };
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

/**
 * Entrar num pedal privado com código de convite (aprovação imediata).
 */
export async function joinPedalWithInvite(
  rawCode: string
): Promise<{ pedalId: string | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("join_pedal_with_invite", {
    raw_code: rawCode,
  });
  if (error) {
    return { pedalId: null, error: new Error(error.message) };
  }
  if (!data || typeof data !== "string") {
    return { pedalId: null, error: new Error("Resposta inválida do servidor.") };
  }
  reportUsabilityEvent({ type: "pedal_join_requested", pedalId: data });
  return { pedalId: data, error: null };
}

export async function regeneratePedalInviteCode(
  pedalId: string
): Promise<{ code: string | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("regenerate_pedal_invite_code", {
    p_pedal_id: pedalId,
  });
  if (error) {
    return { code: null, error: new Error(error.message) };
  }
  if (!data || typeof data !== "string") {
    return { code: null, error: new Error("Resposta inválida do servidor.") };
  }
  return { code: data, error: null };
}

export async function getPedalInviteCodeForCreator(
  pedalId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_pedal_invite_code_for_creator", {
    p_pedal_id: pedalId,
  });
  if (error || data == null || typeof data !== "string") return null;
  return data;
}

const FEMALE_ONLY_JOIN_BLOCKED_MESSAGE =
  "Este pedal é exclusivo para mulheres. Só é possível solicitar participação com gênero feminino no perfil.";

function profileAllowsFemaleOnlyPedal(
  gender: string | null | undefined
): boolean {
  return gender === "feminino";
}

export async function requestJoinPedal(
  pedalId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const [{ data: pedal, error: pedalError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase
        .from("pedals")
        .select("visibility, creator_id")
        .eq("id", pedalId)
        .maybeSingle(),
      supabase.from("profiles").select("gender").eq("id", userId).maybeSingle(),
    ]);

  if (pedalError) return { error: pedalError };
  if (!pedal) return { error: new Error("Pedal não encontrado.") };
  if (profileError) return { error: profileError };

  if (
    pedal.visibility === "female_only" &&
    pedal.creator_id !== userId &&
    !profileAllowsFemaleOnlyPedal(profile?.gender)
  ) {
    return { error: new Error(FEMALE_ONLY_JOIN_BLOCKED_MESSAGE) };
  }

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
    if (!error) {
      reportUsabilityEvent({ type: "pedal_join_requested", pedalId });
    }
    return { error: error ?? null };
  }

  const { error } = await supabase.from("pedal_participants").insert({
    pedal_id: pedalId,
    user_id: userId,
    status: "pending",
  });
  if (!error) {
    reportUsabilityEvent({ type: "pedal_join_requested", pedalId });
  }
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
  if (!error) {
    reportUsabilityEvent({ type: "pedal_message_sent", pedalId });
  }
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
