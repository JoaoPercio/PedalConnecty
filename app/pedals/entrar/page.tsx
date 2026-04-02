"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { useAuth } from "@/contexts/AuthContext";
import { joinPedalWithInvite } from "@/lib/pedal-detail-client";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-surface px-4 py-3 font-mono text-lg tracking-widest text-foreground uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function EntrarComConvitePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Indique o código de convite.");
      return;
    }
    setSubmitting(true);
    const { pedalId, error } = await joinPedalWithInvite(trimmed);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (pedalId) {
      toast.success("Entrou no pedal.");
      router.replace(`/pedals/${pedalId}`);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text-secondary">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-xl font-semibold text-foreground">Entrar com código</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Pedais privados só aceitam participantes com o código partilhado pelo organizador.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="invite-code" className="mb-1.5 block text-sm font-medium text-foreground">
              Código de convite
            </label>
            <input
              id="invite-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="Ex: ABC12XY9"
              className={inputClass}
              maxLength={32}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3.5 text-sm font-semibold text-white shadow-md transition enabled:hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? "A validar…" : "Entrar no pedal"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-text-secondary">
          <Link href="/pedals/mine" className="font-medium text-primary underline">
            Voltar aos meus pedais
          </Link>
        </p>
      </main>

      <FooterNav />
    </div>
  );
}
