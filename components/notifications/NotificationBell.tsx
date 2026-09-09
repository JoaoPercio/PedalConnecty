"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteNotification,
  fetchNotificationsForUser,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/lib/notifications";
import { NotificationList } from "./NotificationList";
import { reportUsabilityEvent } from "@/usability-tests";
import {
  ensureDemoNotificationInList,
  isDemoNotificationId,
  shouldInjectDemoNotification,
  subscribeUsabilityCurrentTestNumber,
} from "@/usability-tests/demo-notification";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [demoActive, setDemoActive] = useState(shouldInjectDemoNotification);
  const [demoUnread, setDemoUnread] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      const active = shouldInjectDemoNotification();
      setDemoActive(active);
      if (active) setDemoUnread(true);
      else setDemoUnread(false);
    };
    sync();
    return subscribeUsabilityCurrentTestNumber(sync);
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!userId) return;
    const { count, error } = await fetchUnreadNotificationCount(userId);
    if (!error) setUnread(count);
  }, [userId]);

  const loadList = useCallback(async () => {
    if (!userId) return;
    setLoadingList(true);
    const { rows, error } = await fetchNotificationsForUser(userId);
    setLoadingList(false);
    if (error) return;

    const withDemo = ensureDemoNotificationInList(userId, rows);
    setItems(withDemo);

    if (withDemo.length > 0) {
      reportUsabilityEvent({
        type: "notification_viewed",
        notificationId: withDemo[0]?.id,
      });
      if (withDemo.some((n) => isDemoNotificationId(n.id))) {
        setDemoUnread(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnread(0);
      setItems([]);
      return;
    }
    void refreshUnread();
  }, [userId, refreshUnread]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refreshUnread();
          if (open) void loadList();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, open, refreshUnread, loadList]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = async () => {
    if (!userId) return;
    const next = !open;
    setOpen(next);
    if (next) {
      await loadList();
      await markAllNotificationsRead(userId);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
      setDemoUnread(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;

    if (isDemoNotificationId(id)) {
      setItems((prev) => prev.filter((x) => x.id !== id));
      setDemoUnread(false);
      return;
    }

    setDeletingId(id);
    const wasUnread = items.find((x) => x.id === id)?.is_read === false;
    const { error } = await deleteNotification(userId, id);
    setDeletingId(null);
    if (!error) {
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (wasUnread) setUnread((c) => Math.max(0, c - 1));
    }
  };

  const badgeCount = unread + (demoActive && demoUnread ? 1 : 0);

  if (!userId) {
    return (
      <button
        type="button"
        className="rounded-full p-2 text-foreground opacity-40"
        aria-label="Notificações"
        disabled
      >
        <BellIcon className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        className="relative rounded-full p-2 text-foreground transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Notificações"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <BellIcon className="h-6 w-6" />
        {badgeCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </button>

      <div
        className={`absolute right-0 top-full z-[1300] mt-2 w-[min(calc(100vw-2rem),22rem)] origin-top-right transform rounded-2xl border border-gray-200 bg-surface shadow-xl ring-1 ring-black/5 transition-[opacity,transform] duration-200 ease-out ${
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notificações</p>
        </div>
        {loadingList && open ? (
          <p className="px-4 py-6 text-center text-sm text-text-secondary">
            Carregando…
          </p>
        ) : (
          <NotificationList
            items={items}
            deletingId={deletingId}
            onDelete={(id) => void handleDelete(id)}
          />
        )}
      </div>
    </div>
  );
}
