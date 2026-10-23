"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MAP_ATTRIBUTION_HTML } from "@/lib/map-tiles";
import { MAP_TOP_RESERVED_PX } from "@/components/map/map-ui";

export type MapCardVariant = "list" | "carousel";

interface MapResultsSheetProps<T> {
  items: T[];
  getId: (item: T) => string;
  /** `onSelect` seleciona o item (centraliza no mapa); útil quando o card é um botão. */
  renderCard: (
    item: T,
    opts: { selected: boolean; variant: MapCardVariant; onSelect: () => void }
  ) => ReactNode;
  renderSkeleton: (variant: MapCardVariant) => ReactNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Muda quando um pin é tocado no mapa (traz o card dele para a vista). */
  focusNonce?: number;
  loading?: boolean;
  title: string;
  emptyState: ReactNode;
  /** Aviso no topo do painel (ex.: erro ao carregar). */
  notice?: ReactNode;
  /** Botões que flutuam acima do painel (localização, criar...). */
  controls?: ReactNode;
  ariaLabel: string;
  /** Ao escolher um item na lista expandida, recolhe o painel para mostrar o mapa. */
  collapseOnListSelect?: boolean;
  /** Altura do painel recolhido (depende da altura do card do carrossel). */
  peekHeight?: number;
}

type Snap = "peek" | "half" | "full";

/** Altura padrão do painel recolhido: cabeçalho + carrossel + atribuição do mapa. */
const PEEK_HEIGHT = 196;
/** Recolhido no estado vazio: cabe a mensagem e os botões. */
const PEEK_HEIGHT_EMPTY = 268;
const FLICK_VELOCITY = 0.45; // px/ms

function ChevronUpIcon({ className }: { className?: string }) {
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
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

/**
 * Resultados de um mapa.
 * - Celular: painel inferior arrastável (recolhido → meio → tela cheia). Recolhido
 *   mostra um carrossel sincronizado com os pins; expandido mostra a lista.
 * - Desktop: lista flutuante no canto inferior esquerdo.
 */
export function MapResultsSheet<T>({
  items,
  getId,
  renderCard,
  renderSkeleton,
  selectedId,
  onSelect,
  focusNonce = 0,
  loading = false,
  title,
  emptyState,
  notice,
  controls,
  ariaLabel,
  collapseOnListSelect = false,
  peekHeight: basePeekHeight = PEEK_HEIGHT,
}: MapResultsSheetProps<T>) {
  const count = items.length;
  const isEmpty = !loading && count === 0;

  const areaRef = useRef<HTMLDivElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const mobileListRef = useRef<HTMLDivElement | null>(null);
  const desktopListRef = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState(560);
  const [snap, setSnap] = useState<Snap>("peek");
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const peekHeight = isEmpty || notice ? Math.max(PEEK_HEIGHT_EMPTY, basePeekHeight) : basePeekHeight;

  // Espaço disponível para o painel (entre o topo flutuante e o footer).
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const update = () => setMaxHeight(Math.max(PEEK_HEIGHT_EMPTY, el.clientHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const snapHeight = useCallback(
    (s: Snap) => {
      if (s === "peek") return peekHeight;
      if (s === "full") return maxHeight;
      return Math.min(maxHeight, Math.max(peekHeight + 120, Math.round(maxHeight * 0.55)));
    },
    [maxHeight, peekHeight]
  );

  const height = dragHeight ?? snapHeight(snap);
  const expanded = height > peekHeight + 40;
  const controlsHidden = height > maxHeight - 120;

  // ---------- arrastar o painel ----------
  const drag = useRef<{
    startY: number;
    startH: number;
    moved: boolean;
    samples: { y: number; t: number }[];
  } | null>(null);

  const clampHeight = (h: number) => Math.min(maxHeight, Math.max(peekHeight - 60, h));

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button[data-sheet-toggle]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      startY: e.clientY,
      startH: height,
      moved: false,
      samples: [{ y: e.clientY, t: e.timeStamp }],
    };
  };

  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    d.samples.push({ y: e.clientY, t: e.timeStamp });
    if (d.samples.length > 6) d.samples.shift();
    if (d.moved) setDragHeight(clampHeight(d.startH - dy));
  };

  const onHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      setSnap((s) => (s === "peek" ? "half" : "peek"));
      return;
    }
    const first = d.samples[0];
    const velocity = (e.clientY - first.y) / Math.max(1, e.timeStamp - first.t); // + = para baixo
    const current = clampHeight(d.startH - (e.clientY - d.startY));
    const order: Snap[] = ["peek", "half", "full"];
    let target: Snap;
    if (velocity < -FLICK_VELOCITY) {
      // Gesto rápido para cima: próxima altura acima da atual.
      target = order.find((s) => snapHeight(s) > current + 10) ?? "full";
    } else if (velocity > FLICK_VELOCITY) {
      // Gesto rápido para baixo: próxima altura abaixo da atual.
      target = [...order].reverse().find((s) => snapHeight(s) < current - 10) ?? "peek";
    } else {
      target = order.reduce((best, s) =>
        Math.abs(snapHeight(s) - current) < Math.abs(snapHeight(best) - current) ? s : best
      );
    }
    setSnap(target);
    setDragHeight(null);
  };

  // ---------- carrossel sincronizado com o mapa ----------
  const scrollEndTimer = useRef<number | null>(null);
  const onCarouselScroll = () => {
    if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = window.setTimeout(() => {
      const c = carouselRef.current;
      if (!c) return;
      const center = c.scrollLeft + c.clientWidth / 2;
      let bestId: string | null = null;
      let bestDist = Infinity;
      c.querySelectorAll<HTMLElement>("[data-item-id]").forEach((el) => {
        const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = el.dataset.itemId ?? null;
        }
      });
      // Só troca a seleção quando já existe uma (o usuário escolheu algo ou deslizou).
      if (bestId && bestId !== selectedId && (selectedId !== null || c.scrollLeft > 8)) {
        onSelect(bestId);
      }
    }, 140);
  };

  useEffect(
    () => () => {
      if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
    },
    []
  );

  // Item selecionado (pelo pin ou pelo carrossel) fica centralizado/visível.
  useEffect(() => {
    if (!selectedId) return;
    const t = window.setTimeout(() => {
      const sel = `[data-item-id="${CSS.escape(selectedId)}"]`;
      const c = carouselRef.current;
      if (c && c.clientWidth > 0 && !expanded) {
        const el = c.querySelector<HTMLElement>(sel);
        if (el) {
          const left = el.offsetLeft - (c.clientWidth - el.offsetWidth) / 2;
          if (Math.abs(c.scrollLeft - left) > 4) c.scrollTo({ left, behavior: "smooth" });
        }
      }
      for (const list of [mobileListRef.current, desktopListRef.current]) {
        if (!list || list.clientHeight === 0) continue;
        const el = list.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const lr = list.getBoundingClientRect();
        if (r.top < lr.top || r.bottom > lr.bottom) {
          list.scrollTo({
            top: list.scrollTop + (r.top - lr.top) - list.clientHeight / 2 + r.height / 2,
            behavior: "smooth",
          });
        }
      }
    }, 60);
    return () => window.clearTimeout(t);
  }, [selectedId, focusNonce, expanded]);

  const selectFromList = (id: string) => {
    onSelect(id);
    if (collapseOnListSelect) setSnap("peek");
  };

  const verticalList = (
    <div className="space-y-2.5">
      {loading && count === 0
        ? [0, 1, 2].map((i) => <div key={i}>{renderSkeleton("list")}</div>)
        : count === 0
          ? emptyState
          : items.map((item) => {
              const id = getId(item);
              return (
                <div key={id} data-item-id={id}>
                  {renderCard(item, {
                    selected: id === selectedId,
                    variant: "list",
                    onSelect: () => selectFromList(id),
                  })}
                </div>
              );
            })}
    </div>
  );

  return (
    <>
      {/* Desktop: lista flutuante no canto inferior esquerdo */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] hidden w-[min(100%,28rem)] lg:left-80 lg:block">
        <div
          ref={desktopListRef}
          className="pointer-events-auto max-h-[min(50dvh,22rem)] overflow-y-auto rounded-3xl bg-surface/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-xl"
        >
          <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
          {notice ? <div className="mb-3">{notice}</div> : null}
          {verticalList}
        </div>
      </div>

      {/* Celular: painel inferior arrastável */}
      <div
        ref={areaRef}
        className="pointer-events-none absolute inset-x-0 z-[700] lg:hidden"
        style={{ top: MAP_TOP_RESERVED_PX, bottom: "var(--footer-space)" }}
      >
        <section
          className={`pointer-events-auto absolute inset-x-2 bottom-0 flex flex-col rounded-[1.75rem] bg-surface shadow-[0_-8px_30px_-10px_rgba(15,23,42,0.3)] ring-1 ring-black/5 ${
            dragHeight === null
              ? "transition-[height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
              : ""
          }`}
          style={{ height }}
          aria-label={ariaLabel}
        >
          {controls ? (
            <div
              className={`absolute bottom-full right-1 mb-3 flex flex-col items-end gap-3 transition-opacity duration-200 ${
                controlsHidden ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
            >
              {controls}
            </div>
          ) : null}

          <div
            className="shrink-0 cursor-grab touch-none select-none px-4 pb-2 pt-2 active:cursor-grabbing"
            data-sheet-handle
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          >
            <span className="mx-auto block h-1.5 w-10 rounded-full bg-gray-300" aria-hidden />
            <div className="mt-2 flex items-center justify-between gap-2">
              <h2 className="truncate text-base font-bold text-foreground">{title}</h2>
              <button
                type="button"
                data-sheet-toggle
                onClick={() => setSnap((s) => (s === "peek" ? "half" : "peek"))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-text-secondary transition active:scale-95"
                aria-expanded={expanded}
                aria-label={expanded ? "Recolher lista" : "Expandir lista"}
              >
                <ChevronUpIcon
                  className={`h-5 w-5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>

          {notice ? <div className="shrink-0 px-3 pb-2">{notice}</div> : null}

          {expanded ? (
            <div ref={mobileListRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
              {verticalList}
            </div>
          ) : (
            <div className="min-h-0 flex-1">
              {loading && count === 0 ? (
                <div className="flex gap-3 overflow-hidden px-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="w-[min(85%,20rem)] shrink-0">
                      {renderSkeleton("carousel")}
                    </div>
                  ))}
                </div>
              ) : count === 0 ? (
                emptyState
              ) : (
                <div
                  ref={carouselRef}
                  onScroll={onCarouselScroll}
                  className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-3 pb-2 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {items.map((item) => {
                    const id = getId(item);
                    return (
                      <div
                        key={id}
                        data-item-id={id}
                        className={`shrink-0 snap-center ${count === 1 ? "w-full" : "w-[min(85%,20rem)]"}`}
                      >
                        {renderCard(item, {
                          selected: id === selectedId,
                          variant: "carousel",
                          onSelect: () => onSelect(id),
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <p
            className="shrink-0 truncate px-4 pb-2 text-right text-[10px] text-text-secondary [&_a]:underline"
            // Constante estática (atribuição exigida pelos provedores do mapa).
            dangerouslySetInnerHTML={{ __html: MAP_ATTRIBUTION_HTML }}
          />
        </section>
      </div>
    </>
  );
}

/** Estado vazio padrão dos painéis de mapa. */
export function MapEmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-2 py-2 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-xl text-primary">
        {icon}
      </span>
      <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
      {actions ? <div className="mt-3 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export const mapSecondaryActionClass =
  "inline-flex min-h-10 items-center rounded-full bg-surface px-4 text-sm font-semibold text-primary ring-1 ring-primary/30 transition active:scale-95";
export const mapPrimaryActionClass =
  "inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-white shadow-sm transition active:scale-95";
