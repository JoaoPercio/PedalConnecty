"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePedalDetail } from "@/hooks/usePedalDetail";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
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
import { PedalDetailHero } from "@/components/pedals/PedalDetailHero";
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
  const router = useRouter();
  const online = useOnlineStatus();
  const { data: pedalData } = usePedalDetail(initialPedal.id, initialPedal);
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
  const [pedalLocalPatch, setPedalLocalPatch] = useState<
    Partial<PedalDetailRecord>
  >({});

  const pedal = { ...(pedalData ?? initialPedal), ...pedalLocalPatch };
  const readOnly = !online;

  const isOwner = !!user?.id && user.id === pedal.creator_id;

  const patchPedal = useCallback((patch: Partial<PedalDetailRecord>) => {
    setPedalLocalPatch((prev) => ({ ...prev, ...patch }));
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
    if (!user?.id || !online) return;
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
  }, [user?.id, pedal.id, online]);

  const onApprove = useCallback(
    async (participantRowId: string) => {
      if (!online) return;
      setPendingBusyId(participantRowId);
      const { error } = await updateParticipantStatus(participantRowId, "approved");
      setPendingBusyId(null);
      if (!error) await refreshParticipants();
    },
    [refreshParticipants, online]
  );

  const onReject = useCallback(
    async (participantRowId: string) => {
      if (!online) return;
      setPendingBusyId(participantRowId);
      const { error } = await updateParticipantStatus(participantRowId, "rejected");
      setPendingBusyId(null);
      if (!error) await refreshParticipants();
    },
    [refreshParticipants, online]
  );

  const onRemoveApproved = useCallback(
    async (participantRowId: string, displayName: string) => {
      if (!user?.id || !online) return;
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
    [user?.id, pedal.id, refreshParticipants, online]
  );

  const onLeftPedal = useCallback(async () => {
    setParticipantsFetched(false);
    if (user?.id) {
      const row = await fetchMyParticipation(pedal.id, user.id);
      setParticipation(row);
    }
  }, [user?.id, pedal.id]);

  const onBack = useCallback(() => {
    // Volta para a tela anterior (lista, mapa, meus pedais); sem histórico, vai para a home.
    if (window.history.length > 1) router.back();
    else router.push("/home");
  }, [router]);

  const activeTabIndex = TABS.findIndex((t) => t.id === activeTab);

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <PedalDetailHero pedal={pedal} onBack={onBack} />

      <div className="sticky top-14 z-[1100] -mx-4 mt-4 bg-background/80 px-4 py-2 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70">
        <div
          className="relative flex rounded-2xl bg-gray-200/60 p-1"
          role="tablist"
          aria-label="Seções do pedal"
        >
          <span
            className="absolute bottom-1 left-1 top-1 rounded-xl bg-surface shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{
              width: `calc((100% - 0.5rem) / ${TABS.length})`,
              transform: `translateX(${activeTabIndex * 100}%)`,
            }}
            aria-hidden
          />
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(t.id)}
                className={`relative z-10 min-h-10 flex-1 rounded-xl px-2 text-sm font-semibold transition-colors ${
                  isActive ? "text-primary" : "text-text-secondary hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        {readOnly ? (
          <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
            Modo offline — apenas leitura
          </p>
        ) : null}
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
            readOnly={readOnly}
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
            readOnly={readOnly}
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
