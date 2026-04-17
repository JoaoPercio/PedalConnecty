"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  displayCreatorName,
  fetchRouteComments,
  insertRouteComment,
  type RouteCommentRow,
} from "@/lib/routes";
import { parseDbTimestamp } from "@/lib/parse-db-timestamp";

interface RouteCommentsProps {
  routeId: string;
}

function formatTime(iso: string): string {
  const d = parseDbTimestamp(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RouteComments({ routeId }: RouteCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<RouteCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const { comments: rows, error: err } = await fetchRouteComments(routeId);
    if (err) {
      setError(err.message);
      setComments([]);
    } else {
      setComments(rows);
    }
    setLoading(false);
  }, [routeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`route_comments:${routeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "route_comments",
          filter: `route_id=eq.${routeId}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [routeId, load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || sending) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    const { error: err } = await insertRouteComment(routeId, user.id, trimmed);
    if (err) {
      setError(err.message);
    } else {
      setBody("");
      await load();
    }
    setSending(false);
  };

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-surface p-4 shadow-sm"
      aria-labelledby="route-comments-heading"
    >
      <h3 id="route-comments-heading" className="text-sm font-semibold text-foreground">
        Comentários
      </h3>

      {loading ? (
        <p className="mt-3 text-sm text-text-secondary">Carregando comentários…</p>
      ) : comments.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">
          Nenhum comentário ainda. Seja o primeiro.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-gray-100 bg-background/80 px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {displayCreatorName(c.profiles)}
                </span>
                <time
                  className="text-xs text-text-secondary"
                  dateTime={c.created_at}
                >
                  {formatTime(c.created_at)}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{c.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-2">
          <label htmlFor="route-comment" className="sr-only">
            Novo comentário
          </label>
          <textarea
            id="route-comment"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Escreva um comentário…"
            className="w-full resize-y rounded-xl border border-gray-200 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {sending ? "Enviando…" : "Comentar"}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-xs text-text-secondary">Faça login para comentar.</p>
      )}

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
