"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPedalMessages } from "@/lib/pedal-detail-client";
import { queryKeys } from "@/lib/query-keys";

export function usePedalMessages(pedalId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.pedalMessages(pedalId),
    queryFn: async () => {
      const { messages, error } = await fetchPedalMessages(pedalId);
      if (error) throw error;
      return messages;
    },
    enabled: enabled && !!pedalId,
  });
}
