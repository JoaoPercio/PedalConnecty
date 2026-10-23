"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getSiteOrigin } from "@/lib/site-origin";
import {
  buildInviteShareMessage,
  buildPedalInviteUrl,
  buildWhatsAppShareUrl,
  canUseWebShare,
  ensurePedalShareInvite,
  revokePedalShareInvite,
  type ShareInviteRecord,
} from "@/lib/pedal-share-invite";

interface SharePedalInviteButtonProps {
  pedalId: string;
  pedalName: string;
}

export function SharePedalInviteButton({
  pedalId,
  pedalName,
}: SharePedalInviteButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-surface py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/5"
      >
        <ShareIcon />
        Convidar pessoas
      </button>
      {open ? (
        <SharePedalInviteModal
          pedalId={pedalId}
          pedalName={pedalName}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function SharePedalInviteModal({
  pedalId,
  pedalName,
  onClose,
}: {
  pedalId: string;
  pedalName: string;
  onClose: () => void;
}) {
  const [invite, setInvite] = useState<ShareInviteRecord | null>(null);
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [webShare, setWebShare] = useState(false);

  useEffect(() => {
    setOrigin(getSiteOrigin());
    setWebShare(canUseWebShare());
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCopied(false);
    ensurePedalShareInvite(pedalId).then(({ invite: next, error: inviteError }) => {
      if (cancelled) return;
      setLoading(false);
      if (inviteError || !next) {
        setInvite(null);
        setError(inviteError?.message ?? "Não foi possível gerar o convite.");
        return;
      }
      setInvite(next);
    });
    return () => {
      cancelled = true;
    };
  }, [pedalId, reloadKey]);

  const link =
    invite && origin ? buildPedalInviteUrl(origin, invite.token) : "";
  const message =
    invite && link
      ? buildInviteShareMessage({
          link,
          allowsDirectJoin: invite.allowsDirectJoin,
        })
      : "";

  async function onCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  function onWhatsApp() {
    if (!message) return;
    window.open(buildWhatsAppShareUrl(message), "_blank", "noopener,noreferrer");
  }

  async function onNativeShare() {
    if (!message || !link || !canUseWebShare()) return;
    try {
      await navigator.share({
        title: pedalName || "Convite para um pedal",
        text: message,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Não foi possível abrir o compartilhamento.");
    }
  }

  async function onRevoke() {
    if (
      !window.confirm(
        "Invalidar este link? Quem já o tiver deixa de conseguir entrar por ele."
      )
    ) {
      return;
    }
    setRevoking(true);
    const { error: revokeError } = await revokePedalShareInvite(pedalId);
    setRevoking(false);
    if (revokeError) {
      toast.error(revokeError.message);
      return;
    }
    toast.success("Link anterior invalidado.");
    setReloadKey((value) => value + 1);
  }

  return (
    <div
      className="fixed inset-0 z-[2600] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-pedal-invite-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar convite"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-gray-200 bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2
            id="share-pedal-invite-title"
            className="text-lg font-semibold text-foreground"
          >
            Convidar pessoas
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 hover:text-foreground"
            aria-label="Fechar"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
            <p className="text-sm text-text-secondary">
              {pedalName
                ? `Compartilhe o pedal ${pedalName}.`
                : "Compartilhe este pedal."}
            </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : null}

          {!loading && error ? (
            <div className="space-y-3">
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="w-full rounded-xl border border-primary/30 py-3 text-sm font-semibold text-primary"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          {!loading && invite && !link && !error ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Não foi possível montar o link neste endereço. Abra o PedalConnect em localhost ou na produção e tente de novo.
            </p>
          ) : null}

          {!loading && invite && link ? (
            <>
              <p className="rounded-xl bg-primary/5 px-3 py-2 text-sm text-foreground">
                {invite.allowsDirectJoin
                  ? "Convite do organizador: quem confirmar entra direto no pedal, sem aprovação."
                  : "Convite de participante: quem confirmar envia um pedido. O organizador aprova ou recusa na aba Participantes."}
              </p>

              <div>
                <label
                  htmlFor="pedal-invite-link"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary"
                >
                  Link do convite
                </label>
                <input
                  id="pedal-invite-link"
                  readOnly
                  value={link}
                  onFocus={(event) => event.currentTarget.select()}
                  className="w-full rounded-xl border border-gray-200 bg-background px-3 py-2.5 text-sm text-foreground"
                />
              </div>

              {copied ? (
                <p className="text-center text-sm font-medium text-secondary" role="status">
                  Link copiado!
                </p>
              ) : null}

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void onCopy()}
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                >
                  {copied ? "Link copiado!" : "Copiar link"}
                </button>
                <button
                  type="button"
                  onClick={onWhatsApp}
                  className="w-full rounded-xl border border-primary/30 bg-surface py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/5"
                >
                  Compartilhar no WhatsApp
                </button>
                {webShare ? (
                  <button
                    type="button"
                    onClick={() => void onNativeShare()}
                    className="w-full rounded-xl border border-gray-200 bg-surface py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-gray-50"
                  >
                    Compartilhar por outro app
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={revoking}
                  onClick={() => void onRevoke()}
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-800 transition enabled:hover:bg-red-100 disabled:opacity-50"
                >
                  {revoking ? "A invalidar…" : "Invalidar link"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
