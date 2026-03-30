"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  averageRatingFromRows,
  upsertRouteRating,
  type RouteWithCreator,
} from "@/lib/routes";

function nextAverageAfterRate(
  route: RouteWithCreator,
  previousUserRating: number | null,
  newRating: number
): number | null {
  const ratings = route.route_ratings ?? [];
  const count = ratings.length;
  const sum = ratings.reduce((a, r) => a + r.rating, 0);

  if (previousUserRating != null) {
    if (count === 0) return newRating;
    const nextSum = sum - previousUserRating + newRating;
    return Math.round((nextSum / count) * 10) / 10;
  }

  const nextSum = sum + newRating;
  const nextCount = count + 1;
  return Math.round((nextSum / nextCount) * 10) / 10;
}

interface RouteRatingProps {
  route: RouteWithCreator;
  userRating: number | null;
  onUpdated?: () => void;
}

export function RouteRating({
  route,
  userRating: initialUserRating,
  onUpdated,
}: RouteRatingProps) {
  const { user } = useAuth();
  const [userRating, setUserRating] = useState<number | null>(initialUserRating);
  const [avg, setAvg] = useState<number | null>(
    averageRatingFromRows(route.route_ratings)
  );
  const [saving, setSaving] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    setUserRating(initialUserRating);
  }, [initialUserRating]);

  useEffect(() => {
    setAvg(averageRatingFromRows(route.route_ratings));
  }, [route.route_ratings]);

  const displayStars = hover ?? userRating ?? 0;

  const handlePick = useCallback(
    async (star: number) => {
      if (!user || saving) return;
      const prev = userRating;
      setSaving(true);
      setUserRating(star);

      const optimisticAvg = nextAverageAfterRate(route, prev, star);
      if (optimisticAvg != null) setAvg(optimisticAvg);

      const { error } = await upsertRouteRating(route.id, user.id, star);
      if (error) {
        setUserRating(prev);
        setAvg(averageRatingFromRows(route.route_ratings));
        setSaving(false);
        return;
      }

      onUpdated?.();
      setSaving(false);
    },
    [user, saving, userRating, route, onUpdated]
  );

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-surface p-4 shadow-sm"
      aria-labelledby="route-rating-heading"
    >
      <h3 id="route-rating-heading" className="text-sm font-semibold text-foreground">
        Avaliações
      </h3>
      <p className="mt-1 text-sm text-text-secondary">
        Média:{" "}
        <span className="font-medium text-foreground">
          {avg != null ? avg.toFixed(1) : "—"}
        </span>
        {avg != null ? (
          <span className="text-amber-500" aria-hidden>
            {" "}
            ★
          </span>
        ) : null}
      </p>

      <div className="mt-3 flex items-center gap-1" role="group" aria-label="Sua nota de 1 a 5">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = displayStars >= n;
          return (
            <button
              key={n}
              type="button"
              disabled={!user || saving}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              onClick={() => void handlePick(n)}
              className={`rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 ${
                active ? "text-amber-500" : "text-gray-300"
              }`}
              aria-label={`${n} estrelas`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-8 w-8"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 3.1 14.7 9l6.6.5-5 4.3 1.5 6.4L12 17.8 6.2 20.2l1.5-6.4-5-4.3 6.6-.5L12 3.1z" />
              </svg>
            </button>
          );
        })}
      </div>
      {!user ? (
        <p className="mt-2 text-xs text-text-secondary">Faça login para avaliar.</p>
      ) : null}
    </section>
  );
}
