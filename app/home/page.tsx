"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { FloatingCreatePedalButton } from "@/components/FloatingCreatePedalButton";

const NearbyPedalsMap = dynamic(
  () =>
    import("@/components/map/NearbyPedalsMap").then((m) => m.NearbyPedalsMap),
  { ssr: false }
);

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background pb-16">
      <Navbar />

      <main className="relative min-h-0 flex-1">
        <NearbyPedalsMap />
      </main>

      <FooterNav />
      <FloatingCreatePedalButton />
    </div>
  );
}
