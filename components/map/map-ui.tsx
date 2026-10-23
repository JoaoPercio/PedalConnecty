"use client";

/**
 * Peças visuais compartilhadas pelas telas de mapa (pedais perto, alertas, lojas):
 * vidro, cápsula do topo, chips de categoria, botão de localização e ponto do usuário.
 */

import type { ReactNode } from "react";

export const mapGlassClass =
  "border border-white/60 bg-white/90 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.35)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/70";

/** Espaço (px) que a cápsula + chips ocupam no topo do mapa no celular. */
export const MAP_TOP_RESERVED_PX = 112;

// ---------- ponto azul do usuário ----------

export const USER_DOT_STYLES = `
  .map-user-dot-icon { background: transparent !important; border: none !important; }
  .map-me { position: relative; display: block; width: 44px; height: 44px; }
  .map-me__dot {
    position: absolute; left: 50%; top: 50%; width: 18px; height: 18px; margin: -9px 0 0 -9px;
    border-radius: 9999px; background: #1A73E8; border: 3px solid #fff;
    box-shadow: 0 1px 6px rgba(0, 0, 0, .35);
  }
  .map-me__pulse {
    position: absolute; inset: 0; border-radius: 9999px; background: rgba(26, 115, 232, .25);
    animation: map-me-pulse 2s ease-out infinite;
  }
  @keyframes map-me-pulse { 0% { transform: scale(.35); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
  .map-pin-icon.is-selected { z-index: 1000 !important; }
  .map-pin-icon .map-pin { transition: transform .2s ease; transform-origin: 50% 100%; }
  .map-pin-icon.is-selected .map-pin { transform: scale(1.3); filter: drop-shadow(0 4px 10px rgba(27, 94, 32, .5)); }
  @media (prefers-reduced-motion: reduce) {
    .map-me__pulse { animation: none; }
    .map-pin-icon .map-pin { transition: none; }
  }
`;

/** Ponto azul pulsante da posição do usuário (padrão dos apps de mapa). */
export function createUserDotIcon(L: typeof import("leaflet")): ReturnType<typeof L.divIcon> {
  return L.divIcon({
    className: "map-user-dot-icon",
    html: `<span class="map-me"><span class="map-me__pulse"></span><span class="map-me__dot"></span></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export function addUserDot(
  L: typeof import("leaflet"),
  layer: L.LayerGroup,
  pos: [number, number]
): void {
  L.marker(pos, {
    icon: createUserDotIcon(L),
    interactive: false,
    keyboard: false,
    zIndexOffset: -1000,
  }).addTo(layer);
}

// ---------- enquadramento ----------

/**
 * Margens (px) da área livre do mapa ao enquadrar: no celular, a barra do topo e
 * o painel recolhido + footer; no desktop, o painel de filtros e a lista.
 * O topo inclui a altura da etiqueta/gota do pin (~46px acima do ponto).
 */
export const MAP_FIT_PADDING = {
  mobile: { topLeft: [40, 180] as [number, number], bottomRight: [40, 300] as [number, number] },
  // Desktop: a lista fica no canto inferior esquerdo e não cobre a área toda.
  desktop: { topLeft: [360, 170] as [number, number], bottomRight: [100, 80] as [number, number] },
};

/** Enquadra os pontos na área visível; um ponto só centraliza com zoom fixo. */
export function fitMapToPoints(
  L: typeof import("leaflet"),
  map: L.Map,
  points: [number, number][],
  singleZoom = 14
): void {
  if (points.length === 0) return;
  if (points.length === 1) {
    map.setView(points[0], singleZoom, { animate: true });
    return;
  }
  const pad = window.innerWidth < 1024 ? MAP_FIT_PADDING.mobile : MAP_FIT_PADDING.desktop;
  map.fitBounds(L.latLngBounds(points), {
    paddingTopLeft: pad.topLeft,
    paddingBottomRight: pad.bottomRight,
    maxZoom: 15,
    animate: true,
  });
}

/** No celular o painel cobre a parte de baixo: centraliza o ponto um pouco acima. */
export function panMapTo(map: L.Map, lat: number, lng: number): void {
  if (window.innerWidth >= 1024) {
    map.panTo([lat, lng], { animate: true, duration: 0.4 });
    return;
  }
  const point = map.project([lat, lng]).add([0, 110]);
  map.panTo(map.unproject(point), { animate: true, duration: 0.4 });
}

// ---------- botões e cápsula ----------

function LocateIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  );
}

export function MapLocateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-white/85 text-primary shadow-lg backdrop-blur-xl transition active:scale-95"
      aria-label="Centralizar na minha localização"
    >
      <LocateIcon className="h-5 w-5" />
    </button>
  );
}

function SlidersIcon({ className }: { className?: string }) {
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
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </svg>
  );
}

interface MapTopBarProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  activeCount: number;
  onOpenFilters: () => void;
  loading?: boolean;
  loadingLabel?: string;
  /** Chips abaixo da cápsula (atalhos de filtro). */
  children?: ReactNode;
}

/** Topo flutuante dos mapas: cápsula de vidro com título e botão de filtros. */
export function MapTopBar({
  icon,
  title,
  subtitle,
  activeCount,
  onOpenFilters,
  loading = false,
  loadingLabel = "Carregando",
  children,
}: MapTopBarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] space-y-2 px-3 pt-3 lg:left-80 lg:right-4 lg:px-4 lg:pt-4">
      <div className={`pointer-events-auto mx-auto flex max-w-xl items-center gap-2 rounded-full p-1.5 pl-4 lg:mx-0 ${mapGlassClass}`}>
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-2 text-left focus:outline-none"
          aria-label="Abrir filtros"
        >
          <span className="shrink-0 text-primary" aria-hidden>
            {icon}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-foreground">
            {title}
            {subtitle ? (
              <span className="font-normal text-text-secondary"> · {subtitle}</span>
            ) : null}
          </span>
          {loading ? (
            <span
              className="ml-1 inline-flex h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-label={loadingLabel}
            />
          ) : null}
        </button>
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-white shadow-sm transition active:scale-95"
        >
          <SlidersIcon className="h-4 w-4" />
          <span className="max-[359px]:sr-only">Filtros</span>
          {activeCount > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-primary">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>

      {children ? (
        <div
          className="pointer-events-auto -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Atalhos de filtro"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function MapChip({
  active,
  onClick,
  children,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition active:scale-95 ${
        active ? "bg-primary text-white shadow-sm" : `text-foreground ${mapGlassClass}`
      }`}
    >
      {children}
      {active ? <span aria-hidden>×</span> : null}
    </button>
  );
}

/**
 * Atalhos por categoria. Com tudo selecionado (padrão), nenhum chip fica ativo;
 * tocar num chip mostra só aquela categoria; tocar em outros soma; desmarcar o
 * último volta a mostrar tudo.
 */
export function CategoryChips<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: K; label: string }[];
  value: Record<K, boolean>;
  onChange: (next: Record<K, boolean>) => void;
}) {
  const keys = options.map((o) => o.id);
  const allOn = keys.every((k) => value[k]);
  return (
    <>
      {options.map((o) => {
        const active = !allOn && value[o.id];
        const toggle = () => {
          let next: Record<K, boolean>;
          if (allOn) {
            next = Object.fromEntries(keys.map((k) => [k, k === o.id])) as Record<K, boolean>;
          } else {
            next = { ...value, [o.id]: !value[o.id] };
            if (keys.every((k) => !next[k])) {
              next = Object.fromEntries(keys.map((k) => [k, true])) as Record<K, boolean>;
            }
          }
          onChange(next);
        };
        return (
          <MapChip key={o.id} active={active} onClick={toggle}>
            {o.label}
          </MapChip>
        );
      })}
    </>
  );
}
