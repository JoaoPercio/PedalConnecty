"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => {
        if (typeof navigator !== "undefined" && !navigator.onLine) return false;
        return failureCount < 2;
      },
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => (await get(key)) ?? null,
    setItem: async (key, value) => {
      await set(key, value);
    },
    removeItem: async (key) => {
      await del(key);
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  const [isRestored, setIsRestored] = useState(false);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" && query.queryKey[0] === "pedalconnect",
        },
      }}
      onSuccess={() => setIsRestored(true)}
    >
      <QueryRestoreGate ready={isRestored}>{children}</QueryRestoreGate>
    </PersistQueryClientProvider>
  );
}

function QueryRestoreGate({
  ready,
  children,
}: {
  ready: boolean;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 300);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready && !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text-secondary">Carregando…</p>
      </div>
    );
  }

  return children;
}
