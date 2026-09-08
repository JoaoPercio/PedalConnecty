"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RouteFavoritesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/routes?tab=favoritas");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-text-secondary">Abrindo favoritos…</p>
    </div>
  );
}
