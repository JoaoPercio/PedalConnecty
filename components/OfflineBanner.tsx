"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[2000] bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white shadow-md"
    >
      Sem ligação — a mostrar dados guardados quando disponíveis
    </div>
  );
}
