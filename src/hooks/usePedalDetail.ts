"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPedalDetail } from "@/lib/pedal-detail-fetch";
import { queryKeys } from "@/lib/query-keys";
import type { PedalDetailRecord } from "@/types/pedal-details";

export function usePedalDetail(
  pedalId: string,
  initialData?: PedalDetailRecord
) {
  return useQuery({
    queryKey: queryKeys.pedalDetail(pedalId),
    queryFn: async () => {
      const pedal = await fetchPedalDetail(pedalId);
      if (!pedal) throw new Error("Pedal não encontrado");
      return pedal;
    },
    initialData,
    enabled: !!pedalId,
  });
}
