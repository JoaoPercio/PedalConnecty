"use client";

import Link from "next/link";
import { AvatarImg } from "@/components/AvatarImg";
import { BikeIcon } from "@/components/pedals/my-pedals-icons";
import type { EnrichedNearbyPedal } from "@/lib/pedal-filters";
import {
  availableSlotsLabel,
  difficultyShortLabel,
  formatPedalDateShort,
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

interface NearbyPedalResultCardProps {
  pedal: EnrichedNearbyPedal;
  selected?: boolean;
  onSelect?: () => void;
}

export function NearbyPedalResultCard({
  pedal,
  selected = false,
  onSelect,
}: NearbyPedalResultCardProps) {
  const slots = availableSlotsLabel(pedal);
  const hasSlots =
    pedal.max_participants == null ||
    pedal.approved_count < pedal.max_participants;

  return (
    <article
      className={`flex items-center gap-3 rounded-2xl border bg-surface p-2.5 shadow-sm transition-all ${
        selected
          ? "border-primary/40 ring-2 ring-primary/15"
          : "border-gray-100 hover:border-primary/20"
      }`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-secondary/20">
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
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <h3 className="line-clamp-1 flex-1 text-sm font-semibold text-foreground">
            {pedal.name}
          </h3>
          <BikeIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{formatPedalDateShort(pedal.date)}</span>
        </p>

        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-secondary">
          <PinIcon className="h-3.5 w-3.5 shrink-0" />
          <span>
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
          <span>{slots}</span>
        </p>
      </div>

      <Link
        href={`/pedals/${pedal.id}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label={`Ver detalhes de ${pedal.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </article>
  );
}
