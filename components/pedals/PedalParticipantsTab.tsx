"use client";

import type { ApprovedParticipant } from "@/types/pedal-details";
import type { PendingParticipantRow } from "@/types/pedal-details";
import { displayNameFromParticipant } from "@/lib/pedal-detail-client";
import { PendingApprovalList } from "@/components/pedals/PendingApprovalList";
import { AvatarImg } from "@/components/AvatarImg";

function skillLevelLabel(level: string | null | undefined): string {
  if (!level) return "—";
  if (level === "iniciante") return "Iniciante";
  if (level === "intermediario") return "Intermediário";
  if (level === "experiente") return "Experiente";
  if (level === "profissional") return "Profissional";
  return level;
}

interface PedalParticipantsTabProps {
  canView: boolean;
  loading: boolean;
  approved: ApprovedParticipant[];
  isOwner: boolean;
  pedalStatus: string;
  creatorId: string | null;
  pending: PendingParticipantRow[];
  pendingBusyId: string | null;
  removeApprovedBusyId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRemoveApproved: (id: string, displayName: string) => void;
  readOnly?: boolean;
}

export function PedalParticipantsTab({
  canView,
  loading,
  approved,
  isOwner,
  pedalStatus,
  creatorId,
  pending,
  pendingBusyId,
  removeApprovedBusyId,
  onApprove,
  onReject,
  onRemoveApproved,
  readOnly = false,
}: PedalParticipantsTabProps) {
  const canRemoveApproved =
    !readOnly && isOwner && pedalStatus === "scheduled" && creatorId != null;
  if (!canView) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-background/60 px-4 py-10 text-center">
        <p className="text-sm text-text-secondary">
          Apenas participantes aprovados ou o organizador podem ver esta lista.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isOwner && !readOnly && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Admin · Solicitações pendentes
          </h3>
          <PendingApprovalList
            items={pending}
            busyId={pendingBusyId}
            onApprove={onApprove}
            onReject={onReject}
          />
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Participantes aprovados ({approved.length})
        </h3>
        {approved.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-background/60 px-4 py-8 text-center text-sm text-text-secondary">
            Ainda não há participantes aprovados.
          </p>
        ) : (
          <ul className="space-y-2">
            {approved.map((row) => {
              const prof = Array.isArray(row.profiles)
                ? row.profiles[0]
                : row.profiles;
              const name = displayNameFromParticipant(row);
              const isOrganizerRow = creatorId != null && row.user_id === creatorId;
              const showRemove = canRemoveApproved && !isOrganizerRow;
              const removing = removeApprovedBusyId === row.id;

              return (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-surface p-3 shadow-sm"
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-background ring-2 ring-primary/10">
                    {prof?.avatar_url ? (
                      <AvatarImg src={prof.avatar_url} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
                        {name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {skillLevelLabel(prof?.skill_level)}
                      {prof?.city ? ` · ${prof.city}` : ""}
                    </p>
                  </div>
                  {showRemove && (
                    <button
                      type="button"
                      disabled={removing}
                      onClick={() => onRemoveApproved(row.id, name)}
                      className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 transition enabled:hover:bg-red-100 disabled:opacity-50"
                    >
                      {removing ? "…" : "Remover"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
