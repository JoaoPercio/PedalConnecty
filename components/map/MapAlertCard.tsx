"use client";

import { AvatarImg } from "@/components/AvatarImg";
import {
  formatTimeRemaining,
  mapAlertPinColors,
  mapAlertTypeMeta,
  type MapAlertWithProfile,
} from "@/lib/map-alerts";
import type { MapCardVariant } from "@/components/map/MapResultsSheet";

function profileDisplayName(p: MapAlertWithProfile["profile"]): string {
  if (!p) return "Ciclista";
  const n = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return n || "Ciclista";
}

/** "agora", "há 5 min", "há 2 h", "há 3 dias". */
export function formatAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "";
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

function formatKm(km: number): string {
  return km.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

interface MapAlertCardProps {
  alert: MapAlertWithProfile;
  distanceKm: number;
  selected: boolean;
  variant: MapCardVariant;
  onSelect: () => void;
  isOwn: boolean;
  onDelete?: () => void;
}

export function MapAlertCard({
  alert,
  distanceKm,
  selected,
  variant,
  onSelect,
  isOwn,
  onDelete,
}: MapAlertCardProps) {
  const meta = mapAlertTypeMeta(alert.type);
  const colors = mapAlertPinColors(alert.type);
  const compact = variant === "carousel";
  const ago = formatAgo(alert.created_at);

  return (
    <div
      className={`flex items-stretch gap-2 rounded-2xl bg-surface p-2.5 transition-shadow ${
        selected ? "shadow-md ring-2 ring-primary/70" : "shadow-sm ring-1 ring-black/5"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
        aria-label={`${meta.label}: ver no mapa`}
      >
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{ background: `${colors.inner}22`, boxShadow: `inset 0 0 0 1.5px ${colors.inner}55` }}
          aria-hidden
        >
          {meta.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{meta.label}</span>
            <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
              {formatKm(distanceKm)} km
            </span>
          </span>
          <span
            className={`mt-0.5 text-xs ${
              alert.description ? "text-foreground" : "italic text-text-secondary"
            } ${compact ? "line-clamp-1" : "line-clamp-2"}`}
          >
            {alert.description || "Sem descrição"}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[11px] text-text-secondary">
            {alert.profile?.avatar_url ? (
              <AvatarImg
                src={alert.profile.avatar_url}
                className="h-4 w-4 shrink-0 rounded-full object-cover"
              />
            ) : null}
            <span className="truncate">
              {isOwn ? "Você" : profileDisplayName(alert.profile)}
              {ago ? ` · ${ago}` : ""} · <span className="font-medium text-primary">{formatTimeRemaining(alert.expires_at)}</span>
            </span>
          </span>
        </span>
      </button>
      {isOwn && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="flex w-11 shrink-0 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 active:scale-95"
          aria-label="Excluir meu alerta"
          title="Excluir meu alerta"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

/** Placeholder genérico dos cards de mapa (alertas e lojas). */
export function MapCardSkeleton() {
  return (
    <div
      className="flex animate-pulse items-center gap-3 rounded-2xl bg-surface p-2.5 shadow-sm ring-1 ring-black/5 motion-reduce:animate-none"
      aria-hidden
    >
      <div className="h-14 w-14 shrink-0 rounded-2xl bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/2 rounded-full bg-gray-200" />
        <div className="h-3 w-3/4 rounded-full bg-gray-200" />
        <div className="h-3 w-2/3 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}
