"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  calculateDistanceKm,
  getElevationGain,
} from "@/lib/pedals";
import {
  createRoute,
  lineStringToStart,
  type RouteGeoJSONLineString,
} from "@/lib/routes";
import { requestUserPosition, getMapCenter } from "@/lib/geolocation";
import type { RouteMapValue } from "./RouteMap";

const RouteMap = dynamic(() => import("./RouteMap").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-text-secondary">
      Carregando mapa…
    </div>
  ),
});

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-surface px-4 py-3 text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow text-base";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

export function CreateRouteForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [routeValue, setRouteValue] = useState<RouteMapValue>({
    geojson: null,
    coordinates: [],
  });
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [elevationM, setElevationM] = useState<number | null>(null);
  const [elevationLoading, setElevationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    setMapCenter(getMapCenter());
    void requestUserPosition().then((c) => setMapCenter(c));
  }, []);

  useEffect(() => {
    if (routeValue.coordinates.length >= 2) {
      setDistanceKm(calculateDistanceKm(routeValue.coordinates));
    } else {
      setDistanceKm(null);
    }
  }, [routeValue.coordinates]);

  const fetchElevation = useCallback(async () => {
    if (routeValue.coordinates.length < 2) return;
    setElevationLoading(true);
    const { elevationGainM, error: err } = await getElevationGain(
      routeValue.coordinates
    );
    setElevationLoading(false);
    if (!err) setElevationM(elevationGainM);
  }, [routeValue.coordinates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError("Faça login para salvar a rota.");
      return;
    }
    if (!name.trim()) {
      setError("Informe o nome da rota.");
      return;
    }
    if (!routeValue.geojson || routeValue.coordinates.length < 2) {
      setError("Desenhe a rota no mapa (mínimo 2 pontos).");
      return;
    }
    if (distanceKm == null) {
      setError("Não foi possível calcular a distância.");
      return;
    }

    setSubmitting(true);

    let elev: number | null = elevationM;
    if (elev == null) {
      setElevationLoading(true);
      const { elevationGainM, error: elErr } = await getElevationGain(
        routeValue.coordinates
      );
      setElevationLoading(false);
      if (!elErr) {
        elev = elevationGainM;
        setElevationM(elevationGainM);
      }
    }

    const geo = routeValue.geojson as RouteGeoJSONLineString;
    const start = lineStringToStart(geo);

    const { routeId, error: err } = await createRoute({
      name: name.trim(),
      description: description.trim() || null,
      route_geojson: geo,
      distance_km: distanceKm,
      elevation_gain: elev,
      user_id: user.id,
      start_lat: start.start_lat,
      start_lng: start.start_lng,
    });

    setSubmitting(false);

    if (err || !routeId) {
      setError(err?.message ?? "Não foi possível salvar.");
      return;
    }

    router.push(`/routes/${routeId}`);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <div>
        <label htmlFor="route-name" className={labelClass}>
          Nome
        </label>
        <input
          id="route-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Ex.: Volta no parque"
          required
        />
      </div>

      <div>
        <label htmlFor="route-desc" className={labelClass}>
          Descrição
        </label>
        <textarea
          id="route-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Detalhes opcionais sobre a rota"
        />
      </div>

      <div>
        <p className={labelClass}>Desenhar rota</p>
        {mapCenter ? (
          <RouteMap
            value={routeValue}
            onChange={setRouteValue}
            height="400px"
            center={mapCenter}
          />
        ) : (
          <div className="flex h-[400px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-text-secondary">
            Obtendo localização…
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-text-secondary">
          <span>
            Distância:{" "}
            <strong className="text-foreground">
              {distanceKm != null ? `${distanceKm.toFixed(1)} km` : "—"}
            </strong>
          </span>
          <span>
            Elevação:{" "}
            <strong className="text-foreground">
              {elevationM != null ? `${elevationM.toFixed(0)} m` : "—"}
            </strong>
            {elevationLoading ? " (calculando…)" : null}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void fetchElevation()}
          disabled={
            elevationLoading || routeValue.coordinates.length < 2
          }
          className="mt-2 text-sm font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
        >
          Calcular elevação
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] py-3.5 text-base font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
      >
        {submitting ? "Salvando…" : "Salvar rota"}
      </button>
    </form>
  );
}
