"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBikeServices, roundCoord } from "@/lib/bike-services-overpass";
import { queryKeys } from "@/lib/query-keys";

/** Lojas mudam pouco: reaproveita o resultado (memória + IndexedDB) por 24h. */
const BIKE_SERVICES_STALE_MS = 24 * 60 * 60 * 1000;

export function useBikeServices(position: [number, number] | null) {
  // Coordenadas arredondadas (~1 km): pequenas variações do GPS caem no mesmo cache.
  const lat = position ? roundCoord(position[0]) : null;
  const lng = position ? roundCoord(position[1]) : null;

  return useQuery({
    queryKey:
      lat != null && lng != null
        ? queryKeys.bikeServices(lat, lng)
        : ["pedalconnect", "bike-services", "none"],
    queryFn: async () => {
      if (lat == null || lng == null) throw new Error("Sem localização");
      const { places, error } = await fetchBikeServices(lat, lng);
      if (error) throw new Error(error);
      return places;
    },
    enabled: lat != null && lng != null,
    staleTime: BIKE_SERVICES_STALE_MS,
  });
}
