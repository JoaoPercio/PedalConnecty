"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { NearbyRoutesList } from "@/components/routes/NearbyRoutesList";

function RoutesPageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-text-secondary">Carregando rotas…</p>
    </div>
  );
}

export default function RoutesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text-secondary">Carregando…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <Suspense fallback={<RoutesPageFallback />}>
          <NearbyRoutesList />
        </Suspense>
      </main>

      <FooterNav />
    </div>
  );
}
