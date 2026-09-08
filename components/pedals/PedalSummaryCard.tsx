"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AvatarImg } from "@/components/AvatarImg";
import {
  BikeIcon,
  CalendarIcon,
  KebabIcon,
  UsersIcon,
} from "@/components/pedals/my-pedals-icons";
import type { PedalSummary } from "@/lib/my-pedals";
import { pedalOccupancyBadge } from "@/lib/pedal-display";

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date;
  }
}

const BADGE: Record<
  ReturnType<typeof pedalOccupancyBadge>,
  { label: string; wrap: string; dot: string }
> = {
  next: {
    label: "Próximo pedal",
    wrap: "bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
  },
  few: {
    label: "Poucas vagas",
    wrap: "bg-orange-50 text-orange-800",
    dot: "bg-orange-500",
  },
  full: {
    label: "Lotado",
    wrap: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  live: {
    label: "Em andamento",
    wrap: "bg-sky-50 text-sky-800",
    dot: "bg-sky-500",
  },
};

interface PedalSummaryCardProps {
  pedal: PedalSummary;
  showOrganizerMenu?: boolean;
}

export function PedalSummaryCard({
  pedal,
  showOrganizerMenu = false,
}: PedalSummaryCardProps) {
  const cap =
    pedal.max_participants != null
      ? `${pedal.approvedCount} / ${pedal.max_participants} participantes`
      : `${pedal.approvedCount} participantes`;
  const badge = BADGE[pedalOccupancyBadge(pedal)];

  return (
    <article className="relative flex gap-3 rounded-2xl border border-gray-100 bg-surface p-3 shadow-sm transition hover:border-primary/20 hover:shadow-md">
      <Link
        href={`/pedals/${pedal.id}`}
        className="flex min-w-0 flex-1 gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-secondary/20 sm:h-24 sm:w-24">
          {pedal.cover_image_url ? (
            <AvatarImg
              src={pedal.cover_image_url}
              className="h-full w-full object-cover"
              alt=""
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary/35">
              <BikeIcon className="h-8 w-8" />
            </div>
          )}
          <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <BikeIcon className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="min-w-0 flex-1 py-0.5 pr-6">
          <h3 className="line-clamp-1 text-[15px] font-semibold text-foreground">
            {pedal.name}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-secondary">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{formatDate(pedal.date)}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
            <UsersIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{cap}</span>
          </p>
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.wrap}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>
      </Link>

      {showOrganizerMenu ? <OrganizerMenu pedalId={pedal.id} /> : null}
    </article>
  );
}

function OrganizerMenu({ pedalId }: { pedalId: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="absolute right-2 top-2">
      <button
        type="button"
        aria-label="Mais opções"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-gray-100 hover:text-foreground"
      >
        <KebabIcon className="h-4 w-4" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-gray-100 bg-surface py-1 shadow-lg"
        >
          <Link
            role="menuitem"
            href={`/pedals/${pedalId}`}
            className="block px-3 py-2 text-sm text-foreground hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            Ver detalhes
          </Link>
          <Link
            role="menuitem"
            href={`/pedals/${pedalId}/edit`}
            className="block px-3 py-2 text-sm text-foreground hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            Editar
          </Link>
        </div>
      ) : null}
    </div>
  );
}
