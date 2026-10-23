import { reportUsabilityEvent } from "@/usability-tests";
import { isShareInviteToken } from "./pedal-share-link";
import { supabase } from "./supabase";

export {
  buildInviteShareMessage,
  buildPedalInviteUrl,
  buildWhatsAppShareUrl,
  canUseWebShare,
  isShareInviteToken,
} from "./pedal-share-link";

export type ShareInviteRecord = {
  token: string;
  allowsDirectJoin: boolean;
};

export type ShareInvitePreviewState =
  | "open"
  | "invalid"
  | "revoked"
  | "completed"
  | "cancelled"
  | "closed";

export type ShareInviteMyStatus = "pending" | "approved" | "rejected";

export type ShareInvitePreview = {
  state: ShareInvitePreviewState;
  allowsDirectJoin: boolean;
  pedalId: string | null;
  name: string | null;
  description: string | null;
  date: string | null;
  startLocation: string | null;
  visibility: string | null;
  status: string | null;
  organizerName: string | null;
  myStatus: ShareInviteMyStatus | null;
  isOrganizer: boolean;
};

export type AcceptShareInviteResult =
  | "joined"
  | "requested"
  | "already_member"
  | "already_pending";

function asRecord(data: unknown): Record<string, unknown> | null {
  if (typeof data === "string") {
    try {
      return asRecord(JSON.parse(data) as unknown);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const PREVIEW_STATES = new Set<ShareInvitePreviewState>([
  "open",
  "invalid",
  "revoked",
  "completed",
  "cancelled",
  "closed",
]);

function parsePreview(data: unknown): ShareInvitePreview | null {
  const row = asRecord(data);
  if (!row) return null;
  const state = row.state;
  if (typeof state !== "string" || !PREVIEW_STATES.has(state as ShareInvitePreviewState)) {
    return null;
  }
  const myStatus = row.my_status;
  const status =
    myStatus === "pending" || myStatus === "approved" || myStatus === "rejected"
      ? myStatus
      : null;

  return {
    state: state as ShareInvitePreviewState,
    allowsDirectJoin: row.allows_direct_join === true,
    pedalId: readString(row, "pedal_id"),
    name: readString(row, "name"),
    description: readString(row, "description"),
    date: readString(row, "date"),
    startLocation: readString(row, "start_location"),
    visibility: readString(row, "visibility"),
    status: readString(row, "status"),
    organizerName: readString(row, "organizer_name"),
    myStatus: status,
    isOrganizer: row.is_organizer === true,
  };
}

function rpcError(error: { message: string } | null, fallback: string): Error {
  const message = error?.message?.trim() ?? "";
  if (/could not find the function/i.test(message) || /schema cache/i.test(message)) {
    return new Error(
      "Os convites por link ainda não estão ativos neste ambiente. Aplique a migration do banco e tente de novo."
    );
  }
  return new Error(message.length > 0 ? message : fallback);
}

export async function ensurePedalShareInvite(
  pedalId: string
): Promise<{ invite: ShareInviteRecord | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("ensure_pedal_share_invite", {
    p_pedal_id: pedalId,
  });
  if (error) {
    return { invite: null, error: rpcError(error, "Não foi possível gerar o convite.") };
  }
  const row = asRecord(data);
  const token = row ? readString(row, "token") : null;
  if (!row || !token || !isShareInviteToken(token)) {
    return { invite: null, error: new Error("Resposta inválida do servidor.") };
  }
  return {
    invite: {
      token: token.toLowerCase(),
      allowsDirectJoin: row.allows_direct_join === true,
    },
    error: null,
  };
}

export async function revokePedalShareInvite(
  pedalId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("revoke_pedal_share_invite", {
    p_pedal_id: pedalId,
  });
  return {
    error: error ? rpcError(error, "Não foi possível invalidar o convite.") : null,
  };
}

export async function fetchPedalShareInvite(
  token: string
): Promise<{ preview: ShareInvitePreview | null; error: Error | null }> {
  if (!isShareInviteToken(token)) {
    return {
      preview: {
        state: "invalid",
        allowsDirectJoin: false,
        pedalId: null,
        name: null,
        description: null,
        date: null,
        startLocation: null,
        visibility: null,
        status: null,
        organizerName: null,
        myStatus: null,
        isOrganizer: false,
      },
      error: null,
    };
  }

  const { data, error } = await supabase.rpc("get_pedal_share_invite", {
    p_token: token.toLowerCase(),
  });
  if (error) {
    return { preview: null, error: rpcError(error, "Não foi possível carregar o convite.") };
  }
  const preview = parsePreview(data);
  if (!preview) {
    return { preview: null, error: new Error("Resposta inválida do servidor.") };
  }
  return { preview, error: null };
}

export async function acceptPedalShareInvite(
  token: string
): Promise<{ result: AcceptShareInviteResult | null; pedalId: string | null; error: Error | null }> {
  if (!isShareInviteToken(token)) {
    return { result: null, pedalId: null, error: new Error("Convite inválido.") };
  }

  const { data, error } = await supabase.rpc("accept_pedal_share_invite", {
    p_token: token.toLowerCase(),
  });
  if (error) {
    return { result: null, pedalId: null, error: rpcError(error, "Não foi possível entrar no pedal.") };
  }

  const row = asRecord(data);
  const result = row?.result;
  const pedalId = row ? readString(row, "pedal_id") : null;
  if (
    result !== "joined" &&
    result !== "requested" &&
    result !== "already_member" &&
    result !== "already_pending"
  ) {
    return { result: null, pedalId: null, error: new Error("Resposta inválida do servidor.") };
  }
  if (!pedalId) {
    return { result: null, pedalId: null, error: new Error("Resposta inválida do servidor.") };
  }

  if (result === "joined" || result === "requested") {
    reportUsabilityEvent({ type: "pedal_join_requested", pedalId });
  }

  return { result, pedalId, error: null };
}
