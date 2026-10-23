"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  authPathWithNext,
  clearAuthNext,
  rememberAuthNext,
  sanitizeAuthNext,
} from "@/lib/auth-next";
import {
  acceptPedalShareInvite,
  fetchPedalShareInvite,
  type ShareInvitePreview,
} from "@/lib/pedal-share-invite";

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date;
  }
}

function visibilityLabel(visibility: string | null): string | null {
  if (visibility === "public") return "Público";
  if (visibility === "female_only") return "Somente mulheres";
  if (visibility === "private") return "Privado";
  return null;
}

function closedMessage(state: ShareInvitePreview["state"]): string | null {
  if (state === "revoked") return "Este convite foi invalidado.";
  if (state === "completed") return "Este pedal já foi encerrado.";
  if (state === "cancelled") return "Este pedal foi cancelado.";
  if (state === "closed") return "Este pedal não está aceitando novos participantes.";
  return null;
}

export function PedalInviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const { user, loading: authLoading, registrationComplete, profileGateLoading } =
    useAuth();
  const [preview, setPreview] = useState<ShareInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const returnPath = sanitizeAuthNext(`/convite/${token.toLowerCase()}`);

  useEffect(() => {
    if (authLoading || profileGateLoading) return;
    if (!returnPath) return;
    if (user && registrationComplete) {
      clearAuthNext();
      return;
    }
    rememberAuthNext(returnPath);
  }, [
    authLoading,
    profileGateLoading,
    registrationComplete,
    returnPath,
    user,
  ]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPedalShareInvite(token).then(({ preview: next, error: loadError }) => {
      if (cancelled) return;
      setLoading(false);
      if (loadError || !next) {
        setPreview(null);
        setError(loadError?.message ?? "Não foi possível carregar o convite.");
        return;
      }
      setPreview(next);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onConfirm() {
    if (!user || !preview || preview.state !== "open") return;
    setSubmitting(true);
    const { result, pedalId, error: acceptError } = await acceptPedalShareInvite(token);
    setSubmitting(false);
    if (acceptError || !result || !pedalId) {
      toast.error(acceptError?.message ?? "Não foi possível entrar no pedal.");
      return;
    }
    if (result === "joined") toast.success("Você entrou no pedal.");
    if (result === "requested") {
      toast.success("Pedido enviado. Aguarde a aprovação do organizador.");
    }
    if (result === "already_member") toast.message("Você já participa deste pedal.");
    if (result === "already_pending") {
      toast.message("Você já tem uma solicitação pendente.");
    }
    router.push(`/pedals/${pedalId}`);
  }

  const blocked = preview ? closedMessage(preview.state) : null;
  const alreadyMember = preview?.myStatus === "approved" || preview?.isOrganizer === true;
  const alreadyPending =
    preview?.state === "open" &&
    preview.myStatus === "pending" &&
    !preview.allowsDirectJoin;
  const showConfirm =
    !!user &&
    preview?.state === "open" &&
    !alreadyMember &&
    !alreadyPending;
  const actionLabel = preview?.allowsDirectJoin
    ? "Participar do pedal"
    : "Solicitar participação";

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        Convite
      </p>
      <h1 className="mt-1 text-xl font-semibold text-foreground">
        Você foi convidado para um pedal
      </h1>

      {loading || authLoading || profileGateLoading ? (
        <div className="mt-8 flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : null}

      {!loading && !authLoading && !profileGateLoading && error ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && !authLoading && !profileGateLoading && preview?.state === "invalid" ? (
        <section className="mt-6 rounded-xl border border-gray-100 bg-surface p-4 shadow-sm">
          <p className="text-sm text-foreground">Este convite é inválido ou não existe mais.</p>
          <Link
            href="/home"
            className="mt-4 inline-flex text-sm font-semibold text-primary underline"
          >
            Ir para o início
          </Link>
        </section>
      ) : null}

      {!loading && !authLoading && !profileGateLoading && preview && preview.state !== "invalid" ? (
        <section className="mt-6 space-y-4 rounded-xl border border-gray-100 bg-surface p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {preview.name ?? "Pedal"}
            </h2>
            {preview.organizerName ? (
              <p className="mt-1 text-sm text-text-secondary">
                Organizado por {preview.organizerName}
              </p>
            ) : null}
          </div>

          {preview.description ? (
            <p className="whitespace-pre-line text-sm text-text-secondary">
              {preview.description}
            </p>
          ) : null}

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {preview.date ? (
              <div>
                <dt className="text-xs text-text-secondary">Data</dt>
                <dd className="font-medium text-foreground">{formatDate(preview.date)}</dd>
              </div>
            ) : null}
            {preview.startLocation ? (
              <div>
                <dt className="text-xs text-text-secondary">Local</dt>
                <dd className="font-medium text-foreground">{preview.startLocation}</dd>
              </div>
            ) : null}
            {visibilityLabel(preview.visibility) ? (
              <div>
                <dt className="text-xs text-text-secondary">Visibilidade</dt>
                <dd className="font-medium text-foreground">
                  {visibilityLabel(preview.visibility)}
                </dd>
              </div>
            ) : null}
          </dl>

          {blocked ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{blocked}</p>
          ) : null}

          {preview.state === "open" && preview.allowsDirectJoin && !alreadyMember ? (
            <p className="text-sm text-text-secondary">
              Este convite do organizador inclui você direto no pedal, depois da confirmação.
            </p>
          ) : null}
          {preview.state === "open" && !preview.allowsDirectJoin && !alreadyMember && !alreadyPending ? (
            <p className="text-sm text-text-secondary">
              Ao confirmar, o organizador recebe um pedido de participação. Você só entra depois da aprovação.
            </p>
          ) : null}
          {alreadyMember ? (
            <p className="text-sm font-medium text-secondary">
              {preview.isOrganizer
                ? "Você organiza este pedal."
                : "Você já participa deste pedal."}
            </p>
          ) : null}
          {alreadyPending ? (
            <p className="text-sm font-medium text-secondary">
              Você já tem uma solicitação pendente. O organizador ainda precisa aprovar.
            </p>
          ) : null}

          {!user && preview.state === "open" && returnPath ? (
            <div className="flex flex-col gap-2">
              <Link
                href={authPathWithNext("/login", returnPath)}
                className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3 text-sm font-semibold text-white shadow-md"
              >
                Entrar para continuar
              </Link>
              <Link
                href={authPathWithNext("/register", returnPath)}
                className="flex w-full items-center justify-center rounded-xl border border-primary/30 py-3 text-sm font-semibold text-primary"
              >
                Criar conta
              </Link>
            </div>
          ) : null}

          {showConfirm ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void onConfirm()}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3 text-sm font-semibold text-white shadow-md transition enabled:hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? "A confirmar…" : actionLabel}
            </button>
          ) : null}

          {user && preview.pedalId && (alreadyMember || alreadyPending || blocked) ? (
            <Link
              href={`/pedals/${preview.pedalId}`}
              className="flex w-full items-center justify-center rounded-xl border border-primary/30 py-3 text-sm font-semibold text-primary"
            >
              Ver pedal
            </Link>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
