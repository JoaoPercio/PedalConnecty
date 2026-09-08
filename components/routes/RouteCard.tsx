"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { RouteWithCreator } from "@/lib/routes";
import {
  averageRatingFromRows,
  displayCreatorWithCity,
  formatDistanceKm,
  formatElevationM,
  formatRating,
  routeMapValueFromLineString,
} from "@/lib/routes";
import { BikeIcon } from "@/components/pedals/my-pedals-icons";
import { RouteFavoriteButton } from "./RouteFavoriteButton";

const RouteMap = dynamic(
  () => import("@/components/pedals/RouteMap").then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-text-secondary">
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

function ElevationIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m3 20 6-8 4 5 4-6 4 9" />
      <path d="M14 11 16.5 7 21 12" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2.5 14.9 8.4l6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.4l1.1-6.5L2.6 9.3l6.5-.9L12 2.5Z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c.8-3.2 3.5-5 7-5s6.2 1.8 7 5" />
    </svg>
  );
}

function MapLegend() {
  return (
    <div className="pointer-events-none absolute left-2.5 top-2.5 z-[500] rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] font-medium leading-4 text-text-secondary shadow-sm ring-1 ring-black/5">
      <p className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#2E7D32]" aria-hidden />
        Início
      </p>
      <p className="mt-0.5 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#C62828]" aria-hidden />
        Chegada
      </p>
      <p className="mt-0.5 flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rotate-45 bg-[#F9A825]"
          aria-hidden
        />
        Parada
      </p>
    </div>
  );
}

export function RouteCard({
  route,
  favorited,
  onFavoriteChange,
  showRoutePreview = false,
}: RouteCardProps) {
  const avg = averageRatingFromRows(route.route_ratings);
  const mapVal = routeMapValueFromLineString(
    route.route_geojson,
    route.route_waypoints
  );
  const canPreview = showRoutePreview && mapVal.coordinates.length >= 2;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-surface shadow-sm transition-shadow hover:shadow-md">
      <div className="relative">
        {canPreview ? (
          <div
            className="h-44 w-full overflow-hidden bg-gray-100 sm:h-48 [&_.leaflet-container]:pointer-events-none [&_.leaflet-control-attribution]:hidden"
            aria-hidden
          >
            <RouteMap
              value={mapVal}
              onChange={() => {}}
              readOnly
              staticDisplay
              height="100%"
              containerClassName="h-full min-h-[11rem] border-0 rounded-none"
            />
          </div>
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-gray-100 text-sm text-text-secondary sm:h-48">
            Sem preview da rota
          </div>
        )}
        {canPreview ? <MapLegend /> : null}
        <div className="absolute right-2.5 top-2.5 z-[500]">
          <RouteFavoriteButton
            routeId={route.id}
            initialFavorited={favorited}
            variant="overlay"
            onChange={(next) => onFavoriteChange?.(route.id, next)}
          />
        </div>
      </div>

      <Link
        href={`/routes/${route.id}`}
        className="block px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
      >
        <h2 className="truncate text-base font-bold text-foreground">
          {route.name}
        </h2>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-text-secondary">
          <UserIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{displayCreatorWithCity(route.creator)}</span>
        </p>
        <dl className="mt-3 flex items-center text-sm text-text-secondary">
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="sr-only">Distância</dt>
            <BikeIcon className="h-4 w-4 shrink-0 text-primary" />
            <dd className="font-medium">{formatDistanceKm(route.distance_km)}</dd>
          </div>
          <div className="mx-3 h-4 w-px shrink-0 bg-gray-200" aria-hidden />
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="sr-only">Elevação</dt>
            <ElevationIcon className="h-4 w-4 shrink-0 text-primary" />
            <dd className="font-medium">
              {formatElevationM(route.elevation_gain)}
            </dd>
          </div>
          <div className="mx-3 h-4 w-px shrink-0 bg-gray-200" aria-hidden />
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="sr-only">Avaliação média</dt>
            <StarIcon className="h-4 w-4 shrink-0 text-amber-500" />
            <dd className="font-semibold text-foreground">{formatRating(avg)}</dd>
          </div>
        </dl>
      </Link>
    </article>
  );
}
