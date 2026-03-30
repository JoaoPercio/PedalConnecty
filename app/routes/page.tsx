"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { NearbyRoutesList } from "@/components/routes/NearbyRoutesList";

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

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-foreground">Rotas perto</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/routes/favorites"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
            >
              Favoritos
            </Link>
            <Link
              href="/routes/create"
              className="rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Criar rota
            </Link>
          </div>
        </header>

        <NearbyRoutesList />
      </main>

      <FooterNav />
    </div>
  );
}
