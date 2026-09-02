"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { FloatingCreatePedalButton } from "@/components/FloatingCreatePedalButton";
import { PedalSummaryCard } from "@/components/pedals/PedalSummaryCard";
import { useMyPedals } from "@/hooks/useMyPedals";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function MeusPedaisPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const online = useOnlineStatus();
  const { data, isLoading, isError, isFetched } = useMyPedals(user?.id);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const owned = data?.owned ?? [];
  const participating = data?.participating ?? [];
  const completed = data?.completed ?? [];
  const loading = isLoading && !data;
  const showOfflineEmpty = !online && isFetched && !data && !isLoading;

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text-secondary">Carregando…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <main className="mx-auto max-w-xl px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Meus pedais</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Pedais que você organiza e pedais em que participa.
            </p>
          </div>
          {online ? (
            <Link
              href="/pedals/entrar"
              className="shrink-0 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/5"
            >
              Código de convite
            </Link>
          ) : null}
        </div>

        {loading && (
          <div className="mt-10 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {(isError || showOfflineEmpty) && !data && (
          <p className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {showOfflineEmpty
              ? "Sem ligação e sem dados guardados para esta página."
              : "Não foi possível carregar os pedais."}
          </p>
        )}

        {!loading && data && (
          <div className="mt-8 space-y-10">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                Organizo
              </h2>
              {owned.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-background/80 px-4 py-8 text-center text-sm text-text-secondary">
                  Você ainda não criou nenhum pedal.
                </p>
              ) : (
                <ul className="space-y-3">
                  {owned.map((p) => (
                    <li key={p.id}>
                      <PedalSummaryCard pedal={p} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                Participo
              </h2>
              {participating.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-background/80 px-4 py-8 text-center text-sm text-text-secondary">
                  Você ainda não participa de outros pedais.
                </p>
              ) : (
                <ul className="space-y-3">
                  {participating.map((p) => (
                    <li key={p.id}>
                      <PedalSummaryCard pedal={p} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                Pedais realizados
              </h2>
              {completed.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-background/80 px-4 py-8 text-center text-sm text-text-secondary">
                  Ainda não há pedais concluídos na sua conta.
                </p>
              ) : (
                <ul className="space-y-3">
                  {completed.map((p) => (
                    <li key={p.id}>
                      <PedalSummaryCard pedal={p} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>

      <FooterNav />
      {online ? <FloatingCreatePedalButton /> : null}
    </div>
  );
}
