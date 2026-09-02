"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMyPedalsLists } from "@/lib/my-pedals";
import { queryKeys } from "@/lib/query-keys";

export function useMyPedals(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? queryKeys.myPedals(userId) : ["pedalconnect", "my-pedals", "none"],
    queryFn: async () => {
      if (!userId) throw new Error("Sem utilizador");
      const result = await fetchMyPedalsLists(userId);
      if (result.error) throw result.error;
      return {
        owned: result.owned,
        participating: result.participating,
        completed: result.completed,
      };
    },
    enabled: !!userId,
  });
}
