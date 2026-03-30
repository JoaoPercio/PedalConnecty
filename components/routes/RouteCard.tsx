"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { RouteWithCreator } from "@/lib/routes";
import {
  averageRatingFromRows,
  displayCreatorName,
  routeMapValueFromLineString,
} from "@/lib/routes";
import { RouteFavoriteButton } from "./RouteFavoriteButton";

const RouteMap = dynamic(
  () => import("@/components/pedals/RouteMap").then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="mb-3 flex h-28 w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xs text-text-secondary sm:h-32">
        Carregando mapa…
      </div>
    ),
  }
);

interface RouteCardProps {
  route: RouteWithCreator;
  favorited: boolean;
  onFavoriteChange?: (routeId: string, favorited: boolean) => void;
  /** Mapa estático com rota na listagem “Rotas perto”. */
  showRoutePreview?: boolean;
}

export function RouteCard({
  route,
  favorited,
  onFavoriteChange,
  showRoutePreview = false,
}: RouteCardProps) {
  const avg = averageRatingFromRows(route.route_ratings);
  const mapVal = routeMapValueFromLineString(route.route_geojson);
  const canPreview =
    showRoutePreview && mapVal.coordinates.length >= 2;

  return (
    <div className="flex gap-1 rounded-2xl border border-gray-200 bg-surface p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
      <Link
        href={`/routes/${route.id}`}
        className="group min-w-0 flex-1 rounded-xl px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {canPreview ? (
          <div
            className="mb-3 h-28 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 sm:h-32 [&_.leaflet-container]:pointer-events-none [&_.leaflet-control-attribution]:pointer-events-none [&_.leaflet-control-attribution]:text-[9px] [&_.leaflet-control-attribution]:leading-tight"
            aria-hidden
          >
            <RouteMap
              value={mapVal}
              onChange={() => {}}
              readOnly
              staticDisplay
              height="100%"
              containerClassName="h-full min-h-[7rem] sm:min-h-[8rem] border-0 rounded-none"
            />
          </div>
        ) : null}
        <h2 className="truncate text-base font-semibold text-foreground group-hover:text-primary">
          {route.name}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {displayCreatorName(route.creator)}
        </p>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
          <div>
            <dt className="sr-only">Distância</dt>
            <dd>
              {route.distance_km != null
                ? `${Number(route.distance_km).toFixed(1)} km`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Elevação</dt>
            <dd>
              {route.elevation_gain != null
                ? `${Number(route.elevation_gain).toFixed(0)} m`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Avaliação média</dt>
            <dd className="flex items-center gap-1">
              <span aria-hidden>★</span>
              {avg != null ? avg.toFixed(1) : "—"}
            </dd>
          </div>
        </dl>
      </Link>
      <div className="flex shrink-0 flex-col items-center justify-start pt-0.5">
        <RouteFavoriteButton
          routeId={route.id}
          initialFavorited={favorited}
          size="sm"
          className="-m-1"
          onChange={(next) => onFavoriteChange?.(route.id, next)}
        />
      </div>
    </div>
  );
}
