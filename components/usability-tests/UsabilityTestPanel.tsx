"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { USABILITY_FEEDBACK_FORM_URL } from "@/usability-tests/config";

const VIEWPORT_MARGIN = 8;
const DRAG_THRESHOLD = 8;

type Anchor = { left: number; bottom: number };

function clampAnchor(
  anchor: Anchor,
  width: number,
  height: number,
): Anchor {
  const maxLeft = Math.max(
    VIEWPORT_MARGIN,
    window.innerWidth - width - VIEWPORT_MARGIN,
  );
  const maxBottom = Math.max(
    VIEWPORT_MARGIN,
    window.innerHeight - height - VIEWPORT_MARGIN,
  );
  return {
    left: Math.round(
      Math.min(maxLeft, Math.max(VIEWPORT_MARGIN, anchor.left)),
    ),
    bottom: Math.round(
      Math.min(maxBottom, Math.max(VIEWPORT_MARGIN, anchor.bottom)),
    ),
  };
}

function sameAnchor(a: Anchor | null, b: Anchor) {
  return a !== null && a.left === b.left && a.bottom === b.bottom;
}

function useFloatingCard(layoutKey: string) {
  const panelRef = useRef<HTMLElement | null>(null);
  const setPanelRef = useCallback((node: HTMLElement | null) => {
    panelRef.current = node;
  }, []);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originBottom: number;
    moved: boolean;
  } | null>(null);
  const ignoreClickRef = useRef(false);
  const stopDragRef = useRef<(() => void) | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [visual, setVisual] = useState<Anchor | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => stopDragRef.current?.();
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const rect = panel.getBoundingClientRect();
    const next = clampAnchor(anchor, rect.width, rect.height);
    setVisual((current) => (sameAnchor(current, next) ? current : next));
  }, [anchor, layoutKey]);

  useEffect(() => {
    function onResize() {
      const panel = panelRef.current;
      if (!panel) return;
      setAnchor((current) => {
        if (!current) return current;
        const rect = panel.getBoundingClientRect();
        const next = clampAnchor(current, rect.width, rect.height);
        return sameAnchor(current, next) ? current : next;
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest("[data-no-drag]")) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originBottom: window.innerHeight - rect.bottom,
      moved: false,
    };
    dragRef.current = drag;

    function onMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== drag.pointerId) return;
      const dx = moveEvent.clientX - drag.startX;
      const dy = moveEvent.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!drag.moved) setDragging(true);
      drag.moved = true;
      moveEvent.preventDefault();
      const current = panelRef.current;
      if (!current) return;
      const box = current.getBoundingClientRect();
      const next = clampAnchor(
        {
          left: drag.originLeft + dx,
          bottom: drag.originBottom - dy,
        },
        box.width,
        box.height,
      );
      setAnchor(next);
      setVisual(next);
    }

    function detach() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (stopDragRef.current === detach) stopDragRef.current = null;
    }

    function onUp(upEvent: PointerEvent) {
      if (upEvent.pointerId !== drag.pointerId) return;
      detach();
      dragRef.current = null;
      setDragging(false);
      if (!drag.moved) return;
      ignoreClickRef.current = true;
      const swallowClick = (clickEvent: MouseEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        ignoreClickRef.current = false;
        window.removeEventListener("click", swallowClick, true);
      };
      window.addEventListener("click", swallowClick, true);
    }

    stopDragRef.current = detach;
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function onClickCapture(event: ReactMouseEvent<HTMLElement>) {
    if (!ignoreClickRef.current) return;
    ignoreClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  const placed = visual ?? anchor;
  const style: CSSProperties | undefined = placed
    ? { left: placed.left, bottom: placed.bottom, top: "auto", right: "auto" }
    : undefined;

  return {
    setPanelRef,
    style,
    dragging,
    onClickCapture,
    handleProps: {
      onPointerDown,
    },
  };
}

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
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 10 16"
      className={className}
      aria-hidden
    >
      <circle cx="2" cy="2" r="1.15" fill="currentColor" />
      <circle cx="8" cy="2" r="1.15" fill="currentColor" />
      <circle cx="2" cy="8" r="1.15" fill="currentColor" />
      <circle cx="8" cy="8" r="1.15" fill="currentColor" />
      <circle cx="2" cy="14" r="1.15" fill="currentColor" />
      <circle cx="8" cy="14" r="1.15" fill="currentColor" />
    </svg>
  );
}

interface UsabilityTestPanelProps {
  guest: boolean;
  currentNumber: number | null;
  total: number;
  title: string;
  description: string;
  completedCount: number;
  skippedCount: number;
  finished: boolean;
  minimized: boolean;
  skipOpen: boolean;
  busy: boolean;
  hasFooter: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  onSkipClick: () => void;
  onSkipCancel: () => void;
  onSkipConfirm: () => void;
}

export function UsabilityTestPanel({
  guest,
  currentNumber,
  total,
  title,
  description,
  completedCount,
  skippedCount,
  finished,
  minimized,
  skipOpen,
  busy,
  hasFooter,
  onMinimize,
  onExpand,
  onSkipClick,
  onSkipCancel,
  onSkipConfirm,
}: UsabilityTestPanelProps) {
  const bottom = hasFooter
    ? "bottom-[calc(4.25rem+env(safe-area-inset-bottom))]"
    : "bottom-4";
  const progressPct = Math.round((completedCount / total) * 100);
  const statusLabel = finished
    ? "Finalizado"
    : currentNumber
      ? `Em andamento`
      : "Pendente";
  const floating = useFloatingCard(`${minimized}-${finished}`);
  const dragCursor = floating.dragging ? "cursor-grabbing" : "cursor-grab";

  if (minimized) {
    return (
      <div
        ref={floating.setPanelRef}
        style={floating.style}
        onClickCapture={floating.onClickCapture}
        {...floating.handleProps}
        className={`fixed ${bottom} left-3 z-[1050] w-[min(100%-5.5rem,20rem)] touch-none select-none rounded-2xl border border-gray-200 bg-surface p-2 shadow-lg shadow-black/10 ring-1 ring-black/5 sm:left-4 ${dragCursor}`}
      >
        <button
          type="button"
          onClick={onExpand}
          className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-expanded={false}
          aria-label="Expandir testes de usabilidade"
          title="Arraste para mover. Toque para expandir."
        >
          <GripIcon className="h-4 w-2.5 shrink-0 text-text-secondary" />
          <span className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">
              🧪 Testes de Usabilidade
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              {finished
                ? "Testes concluídos"
                : `Teste ${currentNumber ?? "—"}/${total} • ${completedCount} concluídos`}
            </p>
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ChevronUpIcon className="h-5 w-5" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      <section
        ref={floating.setPanelRef}
        style={floating.style}
        onClickCapture={floating.onClickCapture}
        className={`fixed ${bottom} left-3 z-[1050] flex w-[min(calc(100vw-1.5rem),26rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-surface shadow-xl shadow-black/10 ring-1 ring-black/5 sm:left-4 ${
          finished
            ? "max-h-[min(70vh,36rem)]"
            : "max-h-[min(48vh,28rem)]"
        }`}
        aria-label="Testes de usabilidade"
      >
        <div
          className={`shrink-0 touch-none select-none border-b border-gray-100 bg-surface p-4 pb-3 ${dragCursor}`}
          title="Arraste para mover"
          {...floating.handleProps}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <GripIcon className="mt-0.5 h-4 w-2.5 shrink-0 text-text-secondary" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Testes de Usabilidade
                </p>
                {!finished && currentNumber ? (
                  <p className="mt-0.5 text-xs font-medium text-primary">
                    Teste {currentNumber} de {total}
                  </p>
                ) : null}
              </div>
            </div>
            <button
                type="button"
                data-no-drag
                onClick={onMinimize}
                className="
                  flex h-10 shrink-0 items-center gap-2
                  rounded-xl border border-gray-200
                  bg-gray-50 px-3
                  text-sm font-semibold text-text-secondary
                  transition-all
                  hover:bg-gray-100 hover:text-foreground
                  active:scale-95
                  focus:outline-none focus:ring-2 focus:ring-primary/30
                "
                aria-label="Minimizar testes de usabilidade"
                title="Minimizar painel"
              >
                <ChevronUpIcon className="h-4 w-4 rotate-180" />
                <span>Minimizar</span>
              </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 pt-3">
        {finished ? (
          <div>
            <p className="text-base font-semibold text-foreground">
              Testes concluídos!
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Você finalizou os testes de usabilidade do PedalConnect.
            </p>
            <p className="mt-2 text-sm text-foreground">
              {completedCount} de {total} testes foram realizados.
            </p>
            {skippedCount > 0 ? (
              <p className="text-sm text-text-secondary">
                {skippedCount}{" "}
                {skippedCount === 1
                  ? "teste não foi realizado."
                  : "testes não foram realizados."}
              </p>
            ) : null}
            <p className="mt-3 text-sm font-semibold text-foreground">
              Próximo passo: o questionário
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
              Responder o formulário é de extrema importância para a pesquisa.
              Sem ele, os testes não podem ser validados — sua opinião é
              essencial para o PedalConnect.
            </p>
            <p className="mt-3 text-sm font-medium text-primary">
              Obrigado pela participação!
            </p>
            <QuestionnaireLink />
          </div>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-foreground">
              {title}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
              {description}
            </p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              Status: {statusLabel}
            </p>
            
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-[1.3]">
                <QuestionnaireLink />
              </div>
            
              {!finished && !guest ? (
                <button
                  type="button"
                  onClick={onSkipClick}
                  className="flex-1 rounded-xl border border-gray-200 bg-background px-3 h-10 text-xs font-medium text-text-secondary transition-colors hover:bg-gray-50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  Não consegui
                </button>
              ) : null}
            </div>
             
          </>
        )}

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-text-secondary">
            <span>
              {completedCount} de {total} concluídos
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1B5E20] to-[#43A047] transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        </div>
      </section>

      {skipOpen ? (
        <div
          className="fixed inset-0 z-[1400] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skip-test-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-surface p-5 shadow-xl">
            <h3
              id="skip-test-title"
              className="text-base font-semibold text-foreground"
            >
              Você não conseguiu realizar este teste?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              Essa informação será registrada como parte da avaliação.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onSkipCancel}
                disabled={busy}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSkipConfirm}
                disabled={busy}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] px-3 py-2.5 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              >
                {busy ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function QuestionnaireLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={USABILITY_FEEDBACK_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#43A047] font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
        compact ? "px-1.5 h-10 text-[11px]" : "px-2 py-2.5 text-[11px]"
      }`}
    >
      Responder questionário
    </a>
  );
}
