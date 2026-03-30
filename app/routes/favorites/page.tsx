"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { FooterNav } from "@/components/FooterNav";
import { RouteCard } from "@/components/routes/RouteCard";
import {
  fetchFavoriteRoutesForUser,
  type RouteWithCreator,
} from "@/lib/routes";

export default function RouteFavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteWithCreator[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { routes: rows, error: err } = await fetchFavoriteRoutesForUser(user.id);
    if (err) {
      setError(err.message);
      setRoutes([]);
    } else {
      setRoutes(rows);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    void load();
  }, [authLoading, user, router, load]);

  const handleFavoriteChange = useCallback((routeId: string, favorited: boolean) => {
    if (!favorited) {
      setRoutes((prev) => prev.filter((r) => r.id !== routeId));
    }
  }, []);

  if (authLoading) {
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
            ← Rotas perto
          </Link>
        </div>
        <h1 className="mb-4 text-xl font-bold text-foreground">Favoritos</h1>

        {loading ? (
          <p className="text-sm text-text-secondary">Carregando favoritos…</p>
        ) : error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : routes.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-surface px-4 py-10 text-center shadow-sm">
            <p className="text-foreground">Você ainda não salvou rotas favoritas.</p>
            <Link
              href="/routes"
              className="mt-4 inline-block rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] px-5 py-2.5 text-sm font-semibold text-white shadow-md"
            >
              Explorar rotas
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {routes.map((r) => (
              <li key={r.id}>
                <RouteCard
                  route={r}
                  favorited
                  onFavoriteChange={handleFavoriteChange}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      <FooterNav />
    </div>
  );
}
