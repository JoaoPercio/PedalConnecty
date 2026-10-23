"use client";

import Link from "next/link";
import { AvatarImg } from "@/components/AvatarImg";
import { BikeIcon } from "@/components/pedals/my-pedals-icons";
import type { EnrichedNearbyPedal } from "@/lib/pedal-filters";
import {
  availableSlotsLabel,
  difficultyShortLabel,
  formatPedalDateShort,
  pedalOccupancyBadge,
  type PedalOccupancyBadge,
} from "@/lib/pedal-display";

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

const OCCUPANCY_BADGE: Partial<Record<PedalOccupancyBadge, { label: string; className: string }>> = {
  live: { label: "Ao vivo", className: "bg-red-500 text-white" },
  few: { label: "Poucas vagas", className: "bg-amber-400 text-amber-950" },
  full: { label: "Lotado", className: "bg-gray-700 text-white" },
};

export function occupancyOf(pedal: EnrichedNearbyPedal): PedalOccupancyBadge {
  return pedalOccupancyBadge({
    approvedCount: pedal.approved_count,
    max_participants: pedal.max_participants,
    status: pedal.status,
  });
}

interface NearbyPedalResultCardProps {
  pedal: EnrichedNearbyPedal;
  selected?: boolean;
  /** `carousel`: card compacto do painel recolhido; `list`: lista expandida. */
  variant?: "list" | "carousel";
}

/** Card de pedal próximo. O card inteiro abre o detalhe. */
export function NearbyPedalResultCard({
  pedal,
  selected = false,
  variant = "list",
}: NearbyPedalResultCardProps) {
  const slots = availableSlotsLabel(pedal);
  const hasSlots =
    pedal.max_participants == null ||
    pedal.approved_count < pedal.max_participants;
  const badge = OCCUPANCY_BADGE[occupancyOf(pedal)];
  const compact = variant === "carousel";

  return (
    <Link
      href={`/pedals/${pedal.id}`}
      aria-label={`Ver detalhes de ${pedal.name}`}
      className={`group flex items-center gap-3 rounded-2xl bg-surface p-2.5 text-left transition-[box-shadow,transform] duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-reduce:transform-none ${
        selected
          ? "shadow-md ring-2 ring-primary/70"
          : "shadow-sm ring-1 ring-black/5 hover:shadow-md"
      }`}
    >
      <div
        className={`relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-secondary/20 ${
          compact ? "h-[4.5rem] w-[4.5rem]" : "h-20 w-24"
        }`}
      >
        {pedal.cover_image_url ? (
          <AvatarImg
            src={pedal.cover_image_url}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/40">
            <BikeIcon className="h-8 w-8" />
          </div>
        )}
        {badge ? (
          <span
            className={`absolute inset-x-0 bottom-0 whitespace-nowrap py-0.5 text-center text-[10px] font-bold leading-tight ${badge.className}`}
          >
            {badge.label}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
          {pedal.name}
        </h3>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{formatPedalDateShort(pedal.date)}</span>
        </p>

        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-secondary">
          <PinIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {pedal.computedDistanceKm.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{" "}
            km • {difficultyShortLabel(pedal.difficulty)}
          </span>
        </p>

        <p
          className={`mt-0.5 flex items-center gap-1.5 text-xs font-medium ${
            hasSlots ? "text-primary" : "text-text-secondary"
          }`}
        >
          <UsersIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{slots}</span>
        </p>
      </div>

      {compact ? null : (
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-300 transition-colors group-hover:text-primary" />
      )}
    </Link>
  );
}

/** Placeholder animado enquanto os pedais carregam. */
export function NearbyPedalCardSkeleton({ variant = "list" }: { variant?: "list" | "carousel" }) {
  const compact = variant === "carousel";
  return (
    <div
      className="flex animate-pulse items-center gap-3 rounded-2xl bg-surface p-2.5 shadow-sm ring-1 ring-black/5 motion-reduce:animate-none"
      aria-hidden
    >
      <div className={`shrink-0 rounded-xl bg-gray-200 ${compact ? "h-[4.5rem] w-[4.5rem]" : "h-20 w-24"}`} />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 rounded-full bg-gray-200" />
        <div className="h-3 w-1/2 rounded-full bg-gray-200" />
        <div className="h-3 w-2/3 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}
