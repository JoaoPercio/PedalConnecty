"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { FloatingCreatePedalButton } from "@/components/FloatingCreatePedalButton";
import { MyPedalsLayout } from "@/components/pedals/MyPedalsLayout";
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

      <main className="mx-auto max-w-4xl px-4 py-6">
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
          <MyPedalsLayout
            owned={owned}
            participating={participating}
            completed={completed}
            showInvite={online}
          />
        )}
      </main>

      <FooterNav />
      {online ? <FloatingCreatePedalButton /> : null}
    </div>
  );
}
