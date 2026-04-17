"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PedalMessageRow } from "@/types/pedal-details";
import {
  displayNameFromMessage,
  fetchPedalMessages,
  sendPedalMessage,
} from "@/lib/pedal-detail-client";
import { parseDbTimestamp } from "@/lib/parse-db-timestamp";

function formatTime(iso: string): string {
  try {
    return parseDbTimestamp(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface PedalChatTabProps {
  pedalId: string;
  userId: string | null;
  canUseChat: boolean;
}

export function PedalChatTab({ pedalId, userId, canUseChat }: PedalChatTabProps) {
  const [messages, setMessages] = useState<PedalMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canUseChat || !pedalId) {
      setLoading(false);
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const { messages: initial, error } = await fetchPedalMessages(pedalId);
      if (cancelled) return;
      if (error) {
        setMessages([]);
      } else {
        setMessages(initial);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel(`pedal-chat:${pedalId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pedal_messages",
          filter: `pedal_id=eq.${pedalId}`,
        },
        async (payload) => {
          const row = payload.new as Pick<
            PedalMessageRow,
            "id" | "pedal_id" | "user_id" | "message" | "created_at"
          >;
          const { data: prof } = await supabase
            .from("profiles")
            .select("first_name, last_name, avatar_url")
            .eq("id", row.user_id)
            .maybeSingle();

          const full: PedalMessageRow = {
            ...row,
            profiles: prof ?? null,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === full.id)) return prev;
            return [...prev, full];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [pedalId, canUseChat]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function handleSend() {
    if (!userId || !canUseChat || sending) return;
    const text = input.trim();
    if (!text) return;
    setSending(true);
    const { error } = await sendPedalMessage(pedalId, userId, text);
    setSending(false);
    if (!error) setInput("");
  }

  if (!canUseChat) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-background/60 px-4 py-10 text-center">
        <p className="text-sm text-text-secondary">
          O chat fica disponível após a aprovação do organizador (ou se você for
          o criador do pedal).
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[min(70vh,520px)] flex-col rounded-xl border border-gray-100 bg-surface shadow-sm">
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">
            Nenhuma mensagem ainda. Seja o primeiro a escrever.
          </p>
        ) : (
          messages.map((m) => (
            <article
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                m.user_id === userId
                  ? "ml-auto bg-gradient-to-br from-primary to-emerald-600 text-white"
                  : "mr-auto bg-background text-foreground"
              }`}
            >
              <p
                className={`text-xs font-semibold ${
                  m.user_id === userId
                    ? "text-white/90"
                    : "text-primary"
                }`}
              >
                {displayNameFromMessage(m)}
              </p>
              <p
                className={`mt-0.5 text-[10px] ${
                  m.user_id === userId
                    ? "text-white/75"
                    : "text-text-secondary"
                }`}
              >
                {formatTime(m.created_at)}
              </p>
              <p
                className={`mt-1 whitespace-pre-wrap break-words ${
                  m.user_id === userId ? "text-white" : ""
                }`}
              >
                {m.message}
              </p>
            </article>
          ))
        )}
      </div>

      <div className="border-t border-gray-100 p-3">
        {!userId ? (
          <p className="text-center text-xs text-text-secondary">
            Inicie sessão para enviar mensagens.
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Escreva uma mensagem…"
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              disabled={sending || !input.trim()}
              onClick={handleSend}
              className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition enabled:hover:brightness-110 disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
