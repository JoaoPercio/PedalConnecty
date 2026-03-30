"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { requestUserPosition } from "@/lib/geolocation";
import {
  fetchBikeServices,
  kindLabel,
  type BikeServiceKind,
  type BikeServicePlace,
} from "@/lib/bike-services-overpass";
import {
  buildBikeServicePopupHtml,
  createKindIcons,
} from "@/components/map/BikeServiceMarker";

const ZOOM = 12;

const KIND_ORDER: BikeServiceKind[] = [
  "loja",
  "oficina",
  "aluguel",
  "estacao",
];

export function BikeServicesMap() {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [places, setPlaces] = useState<BikeServicePlace[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [filters, setFilters] = useState<Record<BikeServiceKind, boolean>>({
    loja: true,
    oficina: true,
    aluguel: true,
    estacao: true,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const poiLayerRef = useRef<L.LayerGroup | null>(null);

  const icons = useMemo(() => createKindIcons(), []);

  useEffect(() => {
    let cancelled = false;
    setLoadingLocation(true);
    requestUserPosition().then((pos) => {
      if (cancelled) return;
      setUserPos(pos);
      setLoadingLocation(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userPos) return;

    let cancelled = false;
    setLoadingPlaces(true);
    setFetchError(false);

    fetchBikeServices(userPos[0], userPos[1]).then(({ places: list, error }) => {
      if (cancelled) return;
      setPlaces(list);
      setFetchError(error !== null);
      setLoadingPlaces(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userPos]);

  const visiblePlaces = useMemo(
    () => places.filter((p) => filters[p.kind]),
    [places, filters]
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!userPos || !el) return;
    if (mapRef.current) return;

    const map = L.map(el, { scrollWheelZoom: true }).setView(userPos, ZOOM);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.circleMarker(userPos, {
      radius: 9,
      color: "#1B5E20",
      fillColor: "#1B5E20",
      fillOpacity: 0.85,
      weight: 2,
    }).addTo(map);

    const poiLayer = L.layerGroup().addTo(map);
    poiLayerRef.current = poiLayer;

    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      poiLayerRef.current = null;
    };
  }, [userPos]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = poiLayerRef.current;
    if (!map || !layer || !userPos) return;

    layer.clearLayers();

    visiblePlaces.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: icons[place.kind],
      });
      marker.bindPopup(
        buildBikeServicePopupHtml(place, userPos[0], userPos[1]),
        { maxWidth: 280 }
      );
      marker.addTo(layer);
    });
  }, [visiblePlaces, userPos, icons]);

  const toggleFilter = (k: BikeServiceKind) => {
    setFilters((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const allFiltersOn = KIND_ORDER.every((k) => filters[k]);

  if (loadingLocation) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!userPos) {
    return null;
  }

  const loading = loadingPlaces;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap gap-2 border-b border-gray-100 bg-surface px-3 py-2">
        <button
          type="button"
          onClick={() =>
            setFilters({
              loja: true,
              oficina: true,
              aluguel: true,
              estacao: true,
            })
          }
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            allFiltersOn
              ? "bg-primary text-white"
              : "bg-background text-text-secondary ring-1 ring-gray-200"
          }`}
        >
          Todos
        </button>
        {KIND_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => toggleFilter(k)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filters[k]
                ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                : "bg-background text-text-secondary opacity-60 ring-1 ring-gray-200"
            }`}
          >
            {kindLabel(k)}
          </button>
        ))}
      </div>

      {fetchError && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2">
          <p className="text-center text-xs text-red-700">
            Erro ao buscar locais. Tente novamente.
          </p>
        </div>
      )}

      {!loading && !fetchError && places.length === 0 && (
        <div className="border-b border-gray-100 bg-background/80 px-4 py-3">
          <p className="text-center text-sm text-text-secondary">
            Nenhum local encontrado em um raio de 30km
          </p>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-surface/80 backdrop-blur-[1px]">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <div
          ref={containerRef}
          className="h-full min-h-[280px] w-full touch-manipulation"
        />
      </div>

      <style>{`
        .bike-service-marker.leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
