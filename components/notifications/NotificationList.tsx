"use client";

import type { NotificationRow } from "@/lib/notifications";
import { NotificationItem } from "./NotificationItem";

interface NotificationListProps {
  items: NotificationRow[];
  deletingId: string | null;
  onDelete: (id: string) => void;
}

export function NotificationList({
  items,
  deletingId,
  onDelete,
}: NotificationListProps) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm text-text-secondary">Nenhuma notificação</p>
        <p className="mt-1 text-xs text-text-secondary">
          Avisos de pedais e mensagens aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <ul className="max-h-[min(70vh,420px)] space-y-2 overflow-y-auto px-2 py-2">
      {items.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          onDelete={onDelete}
          deleting={deletingId === n.id}
        />
      ))}
    </ul>
  );
}
