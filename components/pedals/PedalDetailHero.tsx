"use client";

import { useState } from "react";
import type { PedalDetailRecord } from "@/types/pedal-details";
import { CalendarIcon } from "@/components/pedals/my-pedals-icons";
import {
  ChevronLeftIcon,
  ClockIcon,
  EyeIcon,
  LockIcon,
  UsersIcon,
} from "@/components/pedals/pedal-detail-icons";

function formatHeroDate(iso: string): { day: string; time: string } {
  try {
    const d = new Date(iso);
    const day = d.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "long",
    });
    const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return { day: day.charAt(0).toUpperCase() + day.slice(1), time };
  } catch {
    return { day: iso, time: "" };
  }
}

const STATUS_CHIP: Record<string, { label: string; className: string; live?: boolean }> = {
  scheduled: { label: "Agendado", className: "bg-emerald-500/90 text-white" },
  in_progress: { label: "Em andamento", className: "bg-red-500/90 text-white", live: true },
  completed: { label: "Finalizado", className: "bg-gray-700/85 text-white" },
  cancelled: { label: "Cancelado", className: "bg-gray-500/85 text-white" },
};

function visibilityChip(v: string): { label: string; Icon: typeof EyeIcon } {
  if (v === "private") return { label: "Privado", Icon: LockIcon };
  if (v === "female_only") return { label: "Somente mulheres", Icon: UsersIcon };
  return { label: "Público", Icon: EyeIcon };
}

interface PedalDetailHeroProps {
  pedal: PedalDetailRecord;
  onBack: () => void;
}

/**
 * Cabeçalho do detalhe do pedal. Com capa: banner com título sobre a imagem.
 * Sem capa (ou se a imagem falhar): cabeçalho compacto, sem área de imagem.
 */
export function PedalDetailHero({ pedal, onBack }: PedalDetailHeroProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const cover = pedal.cover_image_url && !coverFailed ? pedal.cover_image_url : null;
  const status = STATUS_CHIP[pedal.status] ?? STATUS_CHIP.scheduled;
  const visibility = visibilityChip(pedal.visibility);
  const { day, time } = formatHeroDate(pedal.date);

  const chips = (onImage: boolean) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
      >
        {status.live ? (
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
        ) : null}
        {status.label}
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
          onImage
            ? "bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-md"
            : "bg-primary/10 text-primary"
        }`}
      >
        <visibility.Icon className="h-3.5 w-3.5" />
        {visibility.label}
      </span>
    </div>
  );

  const dateRow = (onImage: boolean) => (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${
        onImage ? "text-white/90" : "text-text-secondary"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        <CalendarIcon className="h-4 w-4 shrink-0" />
        {day}
      </span>
      {time ? (
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon className="h-4 w-4 shrink-0" />
          {time}
        </span>
      ) : null}
    </div>
  );

  const backButton = (onImage: boolean) => (
    <button
      type="button"
      onClick={onBack}
      aria-label="Voltar"
      className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        onImage
          ? "bg-white/80 text-foreground shadow-md ring-1 ring-black/5 backdrop-blur-md hover:bg-white"
          : "bg-surface text-foreground shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
      }`}
    >
      <ChevronLeftIcon className="h-5 w-5" />
    </button>
  );

  if (cover) {
    return (
      <header className="relative -mx-4 -mt-6 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-3xl sm:shadow-lg">
        <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-primary/20 to-secondary/30 sm:aspect-[16/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={`Capa do pedal ${pedal.name}`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setCoverFailed(true)}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10"
            aria-hidden
          />
          <div className="absolute left-4 top-4">{backButton(true)}</div>
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-4 sm:p-5">
            {chips(true)}
            <h1 className="text-2xl font-bold leading-tight text-white drop-shadow-sm sm:text-3xl">
              {pedal.name}
            </h1>
            {dateRow(true)}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="space-y-3">
      {backButton(false)}
      <div className="space-y-2">
        {chips(false)}
        <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
          {pedal.name}
        </h1>
        {dateRow(false)}
      </div>
    </header>
  );
}
