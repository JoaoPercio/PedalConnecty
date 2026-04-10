"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type {
  ApprovedParticipant,
  PedalDetailRecord,
  PedalParticipantRow,
  PendingParticipantRow,
} from "@/types/pedal-details";
import {
  fetchApprovedParticipants,
  fetchMyParticipation,
  fetchPendingParticipants,
  removeParticipantAsOrganizer,
  requestJoinPedal,
  updateParticipantStatus,
} from "@/lib/pedal-detail-client";
import { PedalChatTab } from "@/components/pedals/PedalChatTab";
import { PedalInfoTab } from "@/components/pedals/PedalInfoTab";
import { PedalParticipantsTab } from "@/components/pedals/PedalParticipantsTab";

const TABS = [
  { id: "info" as const, label: "Informações" },
  { id: "participants" as const, label: "Participantes" },
  { id: "chat" as const, label: "Chat" },
];

type TabId = (typeof TABS)[number]["id"];

interface PedalDetailsProps {
  initialPedal: PedalDetailRecord;
}

export function PedalDetails({ initialPedal }: PedalDetailsProps) {
  const { user, refreshProfileCache } = useAuth();
  const [pedal, setPedal] = useState<PedalDetailRecord>(initialPedal);
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [participation, setParticipation] = useState<PedalParticipantRow | null>(null);
  const [participationLoaded, setParticipationLoaded] = useState(false);
  const [joining, setJoining] = useState(false);
  const [justRequested, setJustRequested] = useState(false);
  const [approved, setApproved] = useState<ApprovedParticipant[]>([]);
  const [pending, setPending] = useState<PendingParticipantRow[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsFetched, setParticipantsFetched] = useState(false);
  const [pendingBusyId, setPendingBusyId] = useState<string | null>(null);
  const [removeApprovedBusyId, setRemoveApprovedBusyId] = useState<string | null>(
    null
  );

  const isOwner = !!user?.id && user.id === pedal.creator_id;

  const patchPedal = useCallback((patch: Partial<PedalDetailRecord>) => {
    setPedal((prev) => ({ ...prev, ...patch }));
  }, []);
  const canViewParticipants =
    isOwner || participation?.status === "approved";
  const canUseChat = canViewParticipants;

  useEffect(() => {
    if (!user?.id) {
      setParticipation(null);
      setParticipationLoaded(true);
      return;
    }
    let cancelled = false;
    setParticipationLoaded(false);
    fetchMyParticipation(pedal.id, user.id).then((row) => {
      if (cancelled) return;
      setParticipation(row);
      setParticipationLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, pedal.id]);

  useEffect(() => {
    setParticipantsFetched(false);
  }, [participation?.status]);

  useEffect(() => {
    if (!user?.id) return;
    if (activeTab !== "participants" && activeTab !== "chat") return;
    fetchMyParticipation(pedal.id, user.id).then((row) =>
      setParticipation(row)
    );
  }, [activeTab, user?.id, pedal.id]);

  useEffect(() => {
    if (activeTab !== "participants" || !canViewParticipants) return;
    if (participantsFetched) return;

    let cancelled = false;
    setParticipantsLoading(true);

    (async () => {
      const [{ rows: appr, error: errA }, pendingRes] = await Promise.all([
        fetchApprovedParticipants(pedal.id),
        isOwner
          ? fetchPendingParticipants(pedal.id)
          : Promise.resolve({ rows: [], error: null as Error | null }),
      ]);

      if (cancelled) return;

      setParticipantsLoading(false);
      if (!errA) setApproved(appr);
      if (isOwner && !pendingRes.error) setPending(pendingRes.rows);
      setParticipantsFetched(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    canViewParticipants,
    participantsFetched,
    pedal.id,
    isOwner,
  ]);

  const refreshParticipants = useCallback(async () => {
    const [apprRes, pendRes] = await Promise.all([
      fetchApprovedParticipants(pedal.id),
      isOwner
        ? fetchPendingParticipants(pedal.id)
        : Promise.resolve({ rows: [], error: null as Error | null }),
    ]);
    if (!apprRes.error) setApproved(apprRes.rows);
    if (isOwner && !pendRes.error) setPending(pendRes.rows);
  }, [pedal.id, isOwner]);

  const onJoin = useCallback(async () => {
    if (!user?.id) return;
    setJoining(true);
    const { error } = await requestJoinPedal(pedal.id, user.id);
    setJoining(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setJustRequested(true);
    const row = await fetchMyParticipation(pedal.id, user.id);
    setParticipation(row);
  }, [user?.id, pedal.id]);

  const onApprove = useCallback(
    async (participantRowId: string) => {
      setPendingBusyId(participantRowId);
      const { error } = await updateParticipantStatus(participantRowId, "approved");
      setPendingBusyId(null);
      if (!error) await refreshParticipants();
    },
    [refreshParticipants]
  );

  const onReject = useCallback(
    async (participantRowId: string) => {
      setPendingBusyId(participantRowId);
      const { error } = await updateParticipantStatus(participantRowId, "rejected");
      setPendingBusyId(null);
      if (!error) await refreshParticipants();
    },
    [refreshParticipants]
  );

  const onRemoveApproved = useCallback(
    async (participantRowId: string, displayName: string) => {
      if (!user?.id) return;
      if (
        !window.confirm(
          `Remover ${displayName} deste pedal? A pessoa pode voltar a pedir para participar.`
        )
      ) {
        return;
      }
      setRemoveApprovedBusyId(participantRowId);
      const { error } = await removeParticipantAsOrganizer(
        pedal.id,
        user.id,
        participantRowId
      );
      setRemoveApprovedBusyId(null);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Participante removido.");
      await refreshParticipants();
    },
    [user?.id, pedal.id, refreshParticipants]
  );

  const onLeftPedal = useCallback(async () => {
    setParticipantsFetched(false);
    if (user?.id) {
      const row = await fetchMyParticipation(pedal.id, user.id);
      setParticipation(row);
    }
  }, [user?.id, pedal.id]);

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <div className="flex gap-1 rounded-2xl bg-background p-1 shadow-sm ring-1 ring-gray-200/80">
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:text-sm ${
                isActive
                  ? "bg-surface text-primary shadow-md ring-1 ring-primary/20"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {activeTab === "info" && (
          <PedalInfoTab
            pedal={pedal}
            userId={user?.id ?? null}
            participation={participation}
            participationLoaded={participationLoaded}
            isOwner={isOwner}
            joining={joining}
            justRequested={justRequested}
            onJoin={onJoin}
            onPedalPatch={patchPedal}
            onCompletedPedal={refreshProfileCache}
            onLeftPedal={onLeftPedal}
          />
        )}
        {activeTab === "participants" && (
          <PedalParticipantsTab
            canView={canViewParticipants}
            loading={participantsLoading}
            approved={approved}
            isOwner={isOwner}
            pedalStatus={pedal.status}
            creatorId={pedal.creator_id}
            pending={pending}
            pendingBusyId={pendingBusyId}
            removeApprovedBusyId={removeApprovedBusyId}
            onApprove={onApprove}
            onReject={onReject}
            onRemoveApproved={onRemoveApproved}
          />
        )}
        {activeTab === "chat" && (
          <PedalChatTab
            pedalId={pedal.id}
            userId={user?.id ?? null}
            canUseChat={canUseChat}
          />
        )}
      </div>
    </main>
  );
}
