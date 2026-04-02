"use client";

import type { PendingParticipantRow } from "@/types/pedal-details";
import { displayNameFromParticipant } from "@/lib/pedal-detail-client";
import { AvatarImg } from "@/components/AvatarImg";

function ageFromBirthDate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function genderLabel(g: string | null | undefined): string {
  if (!g) return "—";
  if (g === "masculino") return "Masculino";
  if (g === "feminino") return "Feminino";
  if (g === "outro") return "Outro";
  return g;
}

interface PendingApprovalListProps {
  items: PendingParticipantRow[];
  busyId: string | null;
  onApprove: (participantRowId: string) => void;
  onReject: (participantRowId: string) => void;
}

export function PendingApprovalList({
  items,
  busyId,
  onApprove,
  onReject,
}: PendingApprovalListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-background/60 px-4 py-6 text-center text-sm text-text-secondary">
        Nenhuma solicitação pendente.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((row) => {
        const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const name = displayNameFromParticipant(row);
        const age = ageFromBirthDate(prof?.birth_date);
        const busy = busyId === row.id;

        return (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-background ring-2 ring-primary/15">
                {prof?.avatar_url ? (
                  <AvatarImg src={prof.avatar_url} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{name}</p>
                <p className="text-xs text-text-secondary">
                  {genderLabel(prof?.gender)}
                  {age !== null ? ` · ${age} anos` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => onApprove(row.id)}
                className="flex-1 rounded-lg bg-gradient-to-r from-primary to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition enabled:hover:brightness-110 disabled:opacity-50 sm:flex-none"
              >
                Aprovar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onReject(row.id)}
                className="flex-1 rounded-lg border border-gray-200 bg-surface px-4 py-2 text-sm font-semibold text-foreground transition enabled:hover:bg-background disabled:opacity-50 sm:flex-none"
              >
                Rejeitar
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
