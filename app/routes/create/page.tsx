"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { CreateRouteForm } from "@/components/routes/CreateRouteForm";

export default function CreateRoutePage() {
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
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/routes"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Voltar
          </Link>
        </div>
        <h1 className="mb-6 text-xl font-bold text-foreground">Nova rota</h1>
        <CreateRouteForm />
      </main>

      <FooterNav />
    </div>
  );
}
