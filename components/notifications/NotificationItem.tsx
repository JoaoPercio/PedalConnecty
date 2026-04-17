"use client";

import Link from "next/link";
import type { NotificationRow } from "@/lib/notifications";
import { parseDbTimestamp } from "@/lib/parse-db-timestamp";

function formatNotifTime(iso: string): string {
  try {
    const d = parseDbTimestamp(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface NotificationItemProps {
  notification: NotificationRow;
  onDelete: (id: string) => void;
  deleting: boolean;
}

export function NotificationItem({
  notification: n,
  onDelete,
  deleting,
}: NotificationItemProps) {
  const pedalId =
    typeof n.data?.pedal_id === "string" ? n.data.pedal_id : null;
  const content = (
    <div
      className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 transition-colors ${
        n.is_read
          ? "border-gray-100 bg-background/60"
          : "border-primary/20 bg-primary/5"
      }`}
    >
      <p className="text-sm font-semibold text-foreground">{n.title}</p>
      <p className="mt-0.5 text-xs text-text-secondary">{n.message}</p>
      <p className="mt-1 text-[10px] text-text-secondary">
        {formatNotifTime(n.created_at)}
      </p>
    </div>
  );

  return (
    <li className="flex gap-2">
      {pedalId ? (
        <Link href={`/pedals/${pedalId}`} className="min-w-0 flex-1">
          {content}
        </Link>
      ) : (
        <div className="min-w-0 flex-1">{content}</div>
      )}
      <button
        type="button"
        disabled={deleting}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(n.id);
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        aria-label="Remover notificação"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </li>
  );
}
