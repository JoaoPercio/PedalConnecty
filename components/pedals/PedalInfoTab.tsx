"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import type { PedalDetailRecord, PedalParticipantRow } from "@/types/pedal-details";
import type { RouteMapValue } from "@/components/pedals/RouteMap";
import { parseStoredRouteWaypoints } from "@/lib/route-waypoints";
import {
  cancelPedalAsCreator,
  completePedalAsCreator,
  getPedalInviteCodeForCreator,
  startPedalAsCreator,
  withdrawFromPedalBeforeStart,
} from "@/lib/pedal-detail-client";

const RouteMap = dynamic(
  () => import("@/components/pedals/RouteMap").then((m) => m.RouteMap),
  { ssr: false }
);

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date;
  }
}

function difficultyLabel(
  diff: PedalDetailRecord["difficulty"]
): string {
  if (!diff) return "Não informado";
  if (diff === "iniciante") return "Iniciante";
  if (diff === "intermediario") return "Intermediário";
  if (diff === "avancado") return "Avançado";
  return diff;
}

function terrainLabel(t: PedalDetailRecord["terrain"]): string {
  if (!t) return "Não informado";
  if (t === "asfalto") return "Asfalto";
  if (t === "terra") return "Terra";
  if (t === "misto") return "Misto";
  if (t === "trilha") return "Trilha";
  return t;
}

function visibilityLabel(v: string): string {
  if (v === "public") return "Público";
  if (v === "female_only") return "Somente mulheres";
  if (v === "private") return "Privado";
  return v;
}

interface PedalInfoTabProps {
  pedal: PedalDetailRecord;
  userId: string | null;
  participation: PedalParticipantRow | null;
  participationLoaded: boolean;
  isOwner: boolean;
  joining: boolean;
  justRequested: boolean;
  onJoin: () => void;
  onPedalPatch: (patch: Partial<PedalDetailRecord>) => void;
  onCompletedPedal?: () => Promise<void>;
  onLeftPedal?: () => Promise<void>;
}

export function PedalInfoTab({
  pedal,
  userId,
  participation,
  participationLoaded,
  isOwner,
  joining,
  justRequested,
  onJoin,
  onPedalPatch,
  onCompletedPedal,
  onLeftPedal,
}: PedalInfoTabProps) {
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const status = pedal.status ?? "scheduled";
  const isPrivate = pedal.visibility === "private";
  const canJoinFlow =
    status === "scheduled" || status === "in_progress";

  const onStartPedal = useCallback(async () => {
    if (!userId || userId !== pedal.creator_id) return;
    if (status !== "scheduled") {
      toast.error("Só é possível iniciar um pedal agendado.");
      return;
    }
    setStarting(true);
    const { error } = await startPedalAsCreator(pedal.id, userId);
    setStarting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onPedalPatch({
      status: "in_progress",
      started_at: new Date().toISOString(),
    });
    toast.success("Pedal iniciado");
  }, [userId, pedal.creator_id, pedal.id, status, onPedalPatch]);

  const onFinishPedal = useCallback(async () => {
    if (!userId || userId !== pedal.creator_id) return;
    if (status !== "in_progress") {
      toast.error("Só é possível finalizar um pedal em andamento.");
      return;
    }
    setFinishing(true);
    const { error } = await completePedalAsCreator(pedal.id, userId);
    setFinishing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onPedalPatch({
      status: "completed",
      ended_at: new Date().toISOString(),
    });
    toast.success("Pedal finalizado");
    await onCompletedPedal?.();
  }, [userId, pedal.creator_id, pedal.id, status, onPedalPatch, onCompletedPedal]);

  const onCancelPedal = useCallback(async () => {
    if (!userId || userId !== pedal.creator_id) return;
    if (status !== "scheduled") {
      toast.error("Só é possível cancelar um pedal agendado.");
      return;
    }
    if (
      !window.confirm(
        "Cancelar este pedal? Os participantes aprovados serão notificados."
      )
    ) {
      return;
    }
    setCancelling(true);
    const { error } = await cancelPedalAsCreator(pedal.id, userId);
    setCancelling(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onPedalPatch({ status: "cancelled" });
    toast.success("Pedal cancelado");
  }, [userId, pedal.creator_id, pedal.id, status, onPedalPatch]);

  useEffect(() => {
    let cancelled = false;
    if (!isOwner || !isPrivate || !userId) {
      queueMicrotask(() => {
        if (!cancelled) {
          setInviteCode(null);
          setInviteLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(() => {
      if (!cancelled) setInviteLoading(true);
    });
    getPedalInviteCodeForCreator(pedal.id).then((c) => {
      if (!cancelled) {
        setInviteCode(c);
        setInviteLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOwner, isPrivate, userId, pedal.id]);

  const onLeavePedal = useCallback(async () => {
    if (!userId) return;
    if (status !== "scheduled") {
      toast.error("Só é possível sair antes do pedal iniciar.");
      return;
    }
    if (!window.confirm("Sair deste pedal? Pode voltar a pedir para participar depois.")) {
      return;
    }
    setLeaving(true);
    const { error } = await withdrawFromPedalBeforeStart(pedal.id, userId);
    setLeaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Você saiu do pedal");
    await onLeftPedal?.();
  }, [userId, pedal.id, status, onLeftPedal]);

  const hasRoute =
    pedal.route_geojson &&
    pedal.route_geojson.type === "LineString" &&
    Array.isArray(pedal.route_geojson.coordinates) &&
    pedal.route_geojson.coordinates.length >= 2;

  const routeValue: RouteMapValue | null = hasRoute
    ? {
        geojson: pedal.route_geojson,
        coordinates: pedal.route_geojson!.coordinates.map(([lng, lat]) => [
          lat,
          lng,
        ]) as [number, number][],
        waypoints: parseStoredRouteWaypoints(pedal.route_waypoints),
      }
    : null;

  const equipmentText =
    pedal.required_equipment?.length > 0
      ? pedal.required_equipment.join(", ")
      : pedal.requires_safety_equipment
        ? "Equipamento de segurança obrigatório"
        : "Não informado";

  const showParticipateBlock = !isOwner;

  let participateBlock: ReactNode = null;

  if (showParticipateBlock) {
    participateBlock = (
      <section className="rounded-xl border border-gray-100 bg-surface p-4 shadow-sm">
        <p className="text-sm font-semibold text-foreground">Participação</p>
        {!canJoinFlow && (
          <p className="mt-2 text-sm text-text-secondary">
            {status === "completed"
              ? "Este pedal já foi realizado."
              : status === "cancelled"
                ? "Este pedal foi cancelado."
                : "Não é possível solicitar participação neste pedal."}
          </p>
        )}
        {!userId && canJoinFlow && isPrivate && (
          <p className="mt-2 text-sm text-text-secondary">
            <Link href="/login" className="font-medium text-primary underline">
              Entre na sua conta
            </Link>{" "}
            e use o{" "}
            <Link href="/pedals/entrar" className="font-medium text-primary underline">
              código de convite
            </Link>{" "}
            para entrar neste pedal privado.
          </p>
        )}
        {!userId && canJoinFlow && !isPrivate && (
          <p className="mt-2 text-sm text-text-secondary">
            <Link href="/login" className="font-medium text-primary underline">
              Entre na sua conta
            </Link>{" "}
            para solicitar participação neste pedal.
          </p>
        )}
        {userId && canJoinFlow && !participationLoaded && (
          <p className="mt-2 text-sm text-text-secondary">A carregar…</p>
        )}
        {userId && canJoinFlow && participationLoaded && !participation && isPrivate && (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-text-secondary">
              Este pedal é privado. Insira o código de convite para entrar diretamente (aprovação imediata).
            </p>
            <Link
              href="/pedals/entrar"
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Inserir código de convite
            </Link>
          </div>
        )}
        {userId && canJoinFlow && participationLoaded && !participation && !isPrivate && (
          <>
            <p className="mt-2 text-sm text-text-secondary">
              Ainda não participa deste pedal.
            </p>
            <button
              type="button"
              disabled={joining || justRequested}
              onClick={onJoin}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3 text-sm font-semibold text-white shadow-md transition enabled:hover:brightness-110 disabled:opacity-50"
            >
              Participar do pedal
            </button>
            {justRequested && (
              <p className="mt-3 text-center text-sm font-medium text-secondary">
                Aguardando aprovação do organizador
              </p>
            )}
          </>
        )}
        {userId &&
          canJoinFlow &&
          participationLoaded &&
          participation?.status === "pending" && (
          <p className="mt-3 text-sm font-medium text-secondary">
            Aguardando aprovação
          </p>
        )}
        {userId &&
          canJoinFlow &&
          participationLoaded &&
          participation?.status === "rejected" &&
          isPrivate && (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-text-secondary">
              Não está aprovado neste pedal. Com um código de convite válido pode voltar a entrar.
            </p>
            <Link
              href="/pedals/entrar"
              className="flex w-full items-center justify-center rounded-xl border border-primary/30 bg-surface py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/5"
            >
              Inserir código de convite
            </Link>
          </div>
        )}
        {userId &&
          canJoinFlow &&
          participationLoaded &&
          participation?.status === "rejected" &&
          !isPrivate && (
          <>
            <p className="mt-2 text-sm text-text-secondary">
              Sua solicitação não foi aprovada. Pode solicitar novamente.
            </p>
            <button
              type="button"
              disabled={joining || justRequested}
              onClick={onJoin}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3 text-sm font-semibold text-white shadow-md transition enabled:hover:brightness-110 disabled:opacity-50"
            >
              Participar do pedal
            </button>
            {justRequested && (
              <p className="mt-3 text-center text-sm font-medium text-secondary">
                Aguardando aprovação do organizador
              </p>
            )}
          </>
        )}
        {userId &&
          canJoinFlow &&
          participationLoaded &&
          participation?.status === "approved" && (
          <p className="mt-2 text-sm text-secondary">
            Você está aprovado. Veja participantes e chat nas outras abas.
          </p>
        )}
        {userId &&
          status === "scheduled" &&
          participationLoaded &&
          participation &&
          (participation.status === "pending" ||
            participation.status === "approved") && (
          <button
            type="button"
            disabled={leaving || joining}
            onClick={onLeavePedal}
            className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-800 shadow-sm transition enabled:hover:bg-red-100 disabled:opacity-50"
          >
            {leaving ? "A sair…" : "Sair do pedal"}
          </button>
        )}
      </section>
    );
  }

  if (isOwner) {
    participateBlock = (
      <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
        <p className="text-sm font-semibold text-foreground">
          Você é o organizador
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Gerencie solicitações na aba Participantes.
        </p>
        {status === "completed" && (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-800 ring-1 ring-emerald-200/80">
            Pedal finalizado ✅
          </p>
        )}
        {status === "cancelled" && (
          <p className="mt-3 rounded-xl bg-gray-100 px-3 py-2 text-center text-sm font-medium text-text-secondary ring-1 ring-gray-200/80">
            Pedal cancelado
          </p>
        )}
        {status === "scheduled" && userId === pedal.creator_id && (
          <button
            type="button"
            disabled={starting}
            onClick={onStartPedal}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3 text-sm font-semibold text-white shadow-md transition enabled:hover:brightness-110 disabled:opacity-50"
          >
            {starting ? "A iniciar…" : "Iniciar Pedal"}
          </button>
        )}
        {status === "in_progress" && userId === pedal.creator_id && (
          <button
            type="button"
            disabled={finishing}
            onClick={onFinishPedal}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3 text-sm font-semibold text-white shadow-md transition enabled:hover:brightness-110 disabled:opacity-50"
          >
            {finishing ? "A finalizar…" : "Finalizar Pedal"}
          </button>
        )}
        {isPrivate && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Código de convite
            </p>
            {inviteLoading ? (
              <p className="mt-2 text-sm text-text-secondary">A carregar…</p>
            ) : inviteCode ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 rounded-lg bg-gray-50 px-3 py-2 font-mono text-base font-semibold tracking-wider text-foreground">
                  {inviteCode}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(inviteCode).then(() => {
                      toast.success("Código copiado");
                    });
                  }}
                  className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
                >
                  Copiar
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">
                Código indisponível. Abra a edição do pedal para gerar um.
              </p>
            )}
            <p className="mt-2 text-xs text-text-secondary">
              Partilhe só com quem quiser no pedal. Pode gerar um código novo em Editar pedal.
            </p>
          </div>
        )}
        {status !== "cancelled" && (
          <Link
            href={`/pedals/${pedal.id}/edit`}
            className="mt-3 flex w-full items-center justify-center rounded-xl border border-primary/30 bg-surface py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/5"
          >
            Editar pedal
          </Link>
        )}
        {status === "scheduled" && userId === pedal.creator_id && (
          <button
            type="button"
            disabled={cancelling || starting}
            onClick={onCancelPedal}
            className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-800 shadow-sm transition enabled:hover:bg-red-100 disabled:opacity-50"
          >
            {cancelling ? "A cancelar…" : "Cancelar pedal"}
          </button>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 bg-surface p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{pedal.name}</h2>
        {pedal.description ? (
          <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
            {pedal.description}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-foreground">{formatDate(pedal.date)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-surface p-4 text-sm shadow-sm">
        <div>
          <p className="text-xs text-text-secondary">Distância</p>
          <p className="font-semibold text-foreground">
            {pedal.distance_km !== null ? `${pedal.distance_km} km` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Elevação</p>
          <p className="font-semibold text-foreground">
            {pedal.elevation_gain !== null ? `${pedal.elevation_gain} m` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Dificuldade</p>
          <p className="font-semibold text-foreground">
            {difficultyLabel(pedal.difficulty)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Terreno</p>
          <p className="font-semibold text-foreground">
            {terrainLabel(pedal.terrain)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Máx. participantes</p>
          <p className="font-semibold text-foreground">
            {pedal.max_participants ?? "Sem limite"}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Visibilidade</p>
          <p className="font-semibold text-foreground">
            {visibilityLabel(pedal.visibility)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-text-secondary">Equipamento obrigatório</p>
          <p className="font-semibold text-foreground">{equipmentText}</p>
        </div>
      </div>

      {participateBlock}

      {hasRoute && routeValue && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Rota do pedal</p>
          <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
            <RouteMap
              value={routeValue}
              onChange={() => {}}
              readOnly
              height="240px"
            />
          </div>
          {routeValue.waypoints.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Paradas
              </p>
              <ol className="mt-1.5 list-inside list-decimal space-y-1 text-sm text-foreground">
                {routeValue.waypoints.map((w) => (
                  <li key={w.id}>{w.name.trim() || "Parada"}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
