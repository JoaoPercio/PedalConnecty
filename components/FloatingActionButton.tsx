"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

const HINT_VISIBLE_MS = 3500;

interface FloatingActionButtonProps {
  /** Texto do tooltip (e do leitor de tela). */
  label: string;
  ariaLabel: string;
  href?: string;
  onClick?: () => void;
  /** Chave da dica automática (mostrada uma vez por sessão; no celular não há hover). */
  hintKey: string;
  className?: string;
  placement?: "fixed" | "inline";
  hideBelowLg?: boolean;
}

/** Botão "+" redondo com tooltip à esquerda. */
export function FloatingActionButton({
  label,
  ariaLabel,
  href,
  onClick,
  hintKey,
  className = "",
  placement = "fixed",
  hideBelowLg = false,
}: FloatingActionButtonProps) {
  const tooltipId = useId();
  const [hintVisible, setHintVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Pode haver uma cópia escondida (ex.: versão desktop no celular); só a visível mostra a dica.
    if (!wrapperRef.current || wrapperRef.current.getClientRects().length === 0) return;
    let shown = false;
    try {
      shown = sessionStorage.getItem(hintKey) === "1";
      sessionStorage.setItem(hintKey, "1");
    } catch {
      // Sem storage (aba privada): mostra a dica mesmo assim.
    }
    if (shown) return;
    const show = setTimeout(() => setHintVisible(true), 600);
    const hide = setTimeout(() => setHintVisible(false), 600 + HINT_VISIBLE_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [hintKey]);

  const positionClass =
    placement === "inline"
      ? "relative"
      : "fixed right-4 bottom-[calc(var(--footer-space)+0.5rem)]";
  const visibilityClass = hideBelowLg ? "hidden lg:flex" : "flex";
  const buttonClass =
    "flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#1B5E20] to-[#43A047] text-2xl font-light text-white shadow-lg shadow-primary/30 transition hover:opacity-95 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30";

  return (
    <div ref={wrapperRef} className={`group ${positionClass} ${visibilityClass} z-[1010] items-center ${className}`}>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gray-900/90 px-3 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100 motion-reduce:transition-none ${
          hintVisible ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0"
        }`}
      >
        {label}
        <span
          className="absolute left-full top-1/2 -translate-y-1/2 border-y-[6px] border-l-[6px] border-y-transparent border-l-gray-900/90"
          aria-hidden
        />
      </span>
      {href ? (
        <Link href={href} className={buttonClass} aria-label={ariaLabel} aria-describedby={tooltipId}>
          +
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={buttonClass} aria-label={ariaLabel} aria-describedby={tooltipId}>
          +
        </button>
      )}
    </div>
  );
}
