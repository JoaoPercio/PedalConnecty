"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { PedalDetailRecord, PedalParticipantRow } from "@/types/pedal-details";
import type { RouteMapValue } from "@/components/pedals/RouteMap";

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
}: PedalInfoTabProps) {
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
        {!userId && (
          <p className="mt-2 text-sm text-text-secondary">
            <Link href="/login" className="font-medium text-primary underline">
              Entre na sua conta
            </Link>{" "}
            para solicitar participação neste pedal.
          </p>
        )}
        {userId && !participationLoaded && (
          <p className="mt-2 text-sm text-text-secondary">A carregar…</p>
        )}
        {userId && participationLoaded && !participation && (
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
        {userId && participationLoaded && participation?.status === "pending" && (
          <p className="mt-3 text-sm font-medium text-secondary">
            Aguardando aprovação
          </p>
        )}
        {userId && participationLoaded && participation?.status === "rejected" && (
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
        {userId && participationLoaded && participation?.status === "approved" && (
          <p className="mt-2 text-sm text-secondary">
            Você está aprovado. Veja participantes e chat nas outras abas.
          </p>
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
        <Link
          href={`/pedals/${pedal.id}/edit`}
          className="mt-3 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          Editar pedal
        </Link>
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
        </section>
      )}
    </div>
  );
}
