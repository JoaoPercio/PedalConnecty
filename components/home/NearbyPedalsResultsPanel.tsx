"use client";

import { useEffect, useRef, useState } from "react";
import type { EnrichedNearbyPedal } from "@/lib/pedal-filters";
import { FloatingCreatePedalButton } from "@/components/FloatingCreatePedalButton";
import { NearbyPedalResultCard } from "./NearbyPedalResultCard";

interface NearbyPedalsResultsPanelProps {
  pedals: EnrichedNearbyPedal[];
  selectedId: string | null;
  onSelectPedal: (id: string) => void;
  loading?: boolean;
  focusNonce?: number;
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function NearbyPedalsResultsPanel({
  pedals,
  selectedId,
  onSelectPedal,
  loading = false,
  focusNonce = 0,
}: NearbyPedalsResultsPanelProps) {
  const count = pedals.length;
  const countLabel =
    count === 1 ? "1 pedal encontrado" : `${count} pedais encontrados`;

  const [collapsed, setCollapsed] = useState(false);
  const desktopListRef = useRef<HTMLDivElement | null>(null);
  const mobileListRef = useRef<HTMLDivElement | null>(null);
  const prevFocusNonceRef = useRef(focusNonce);

  const toggleCollapsed = () => setCollapsed((value) => !value);

  useEffect(() => {
    if (!selectedId) return;
    setCollapsed(false);
  }, [selectedId, focusNonce]);

  useEffect(() => {
    if (collapsed || !selectedId) return;

    const fromMap = focusNonce !== prevFocusNonceRef.current;

    const timeout = window.setTimeout(() => {
      prevFocusNonceRef.current = focusNonce;
      const containers = [mobileListRef.current, desktopListRef.current];
      const container = containers.find((el) => el && el.clientHeight > 0);
      if (!container) return;
      const node = container.querySelector<HTMLElement>(
        `[data-pedal-id="${CSS.escape(selectedId)}"]`
      );
      if (!node) return;

      const nodeRect = node.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const fullyVisible =
        nodeRect.top >= containerRect.top &&
        nodeRect.bottom <= containerRect.bottom;

      if (!fromMap && fullyVisible) return;

      const nextTop = fromMap
        ? container.scrollTop +
          (nodeRect.top - containerRect.top) -
          container.clientHeight / 2 +
          nodeRect.height / 2
        : nodeRect.top < containerRect.top
          ? container.scrollTop + (nodeRect.top - containerRect.top) - 8
          : container.scrollTop + (nodeRect.bottom - containerRect.bottom) + 8;

      container.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [selectedId, collapsed, focusNonce]);

  const list = (
    <>
      {!loading && count === 0 ? (
        <p className="rounded-xl bg-background px-3 py-4 text-center text-sm text-text-secondary">
          Nenhum pedal encontrado com os filtros selecionados.
        </p>
      ) : (
        <div className="space-y-2">
          {pedals.map((pedal) => (
            <div key={pedal.id} data-pedal-id={pedal.id}>
              <NearbyPedalResultCard
                pedal={pedal}
                selected={pedal.id === selectedId}
                onSelect={() => onSelectPedal(pedal.id)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop: floating card bottom-left */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] hidden w-[min(100%,28rem)] lg:left-80 lg:block">
        <div
          ref={desktopListRef}
          className="pointer-events-auto max-h-[min(50dvh,22rem)] overflow-y-auto rounded-2xl border border-gray-200/80 bg-surface/95 p-4 shadow-lg backdrop-blur-sm"
        >
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Pedais próximos
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              {loading ? "Carregando…" : countLabel}
            </p>
          </div>
          {list}
        </div>
      </div>

      {/* Mobile: create button above collapsible bottom sheet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1010] lg:hidden">
        <div className="pointer-events-auto mb-2 flex justify-end px-4">
          <FloatingCreatePedalButton placement="inline" />
        </div>
        <div className="pointer-events-auto rounded-t-2xl border border-b-0 border-gray-200 bg-surface px-4 pb-2 pt-1 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex w-full flex-col items-center py-1.5"
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? "Expandir lista de pedais" : "Reduzir lista de pedais"
            }
          >
            <span className="h-1 w-10 rounded-full bg-gray-300" aria-hidden />
          </button>

          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">
                Pedais próximos
              </h2>
              <p className="mt-0.5 text-xs text-text-secondary">
                {loading ? "Carregando…" : countLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-gray-100 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-expanded={!collapsed}
              aria-label={
                collapsed
                  ? "Expandir lista de pedais"
                  : "Reduzir lista de pedais"
              }
            >
              <ChevronDownIcon
                className={`h-5 w-5 transition-transform duration-200 ${
                  collapsed ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <div
            ref={mobileListRef}
            className={
              collapsed
                ? "hidden"
                : "max-h-[min(42dvh,20rem)] overflow-y-auto pb-1"
            }
          >
            {list}
          </div>
        </div>
      </div>
    </>
  );
}
