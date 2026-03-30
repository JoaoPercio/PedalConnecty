"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { RouteDetailView } from "@/components/routes/RouteDetailView";

export default function RouteDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
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
        {id ? <RouteDetailView routeId={id} /> : (
          <p className="text-sm text-text-secondary">Rota inválida.</p>
        )}
      </main>

      <FooterNav />
    </div>
  );
}
