"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  hasPushSubscription,
  isPushSupported,
  subscribeToPush,
} from "@/lib/push-notifications";

const DISMISS_KEY = "pedalconnect_push_prompt_dismissed";

export function PushNotificationPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id || !isPushSupported()) return;
    if (process.env.NODE_ENV !== "production") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;

    void hasPushSubscription(user.id).then((has) => {
      if (!has) setVisible(true);
    });
  }, [user?.id]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }, []);

  const enable = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    const { error } = await subscribeToPush(user.id);
    setBusy(false);
    if (error) {
      dismiss();
      return;
    }
    setVisible(false);
  }, [user?.id, dismiss]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-[1900] mx-auto max-w-md rounded-2xl border border-gray-200 bg-surface p-4 shadow-xl">
      <p className="text-sm font-semibold text-foreground">
        Ativar notificações?
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        Receba alertas de pedidos de entrada, mensagens e atualizações dos
        pedais mesmo com a app fechada.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void enable()}
          className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "A activar…" : "Activar"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-text-secondary"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
