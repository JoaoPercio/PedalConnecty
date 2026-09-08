"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";

const MapAlertsMap = dynamic(
  () => import("@/components/map/MapAlertsMap").then((m) => m.MapAlertsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  }
);

export default function MapAlertsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [filterModalOpen, setFilterModalOpen] = useState(false);

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
      <Navbar onMenuClick={() => setFilterModalOpen(true)} />

      <main className="relative min-h-0 flex-1">
        <MapAlertsMap
          filterModalOpen={filterModalOpen}
          onFilterModalOpenChange={setFilterModalOpen}
        />
      </main>

      <FooterNav />
    </div>
  );
}
