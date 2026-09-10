"use client";

import Link from "next/link";

interface FloatingCreatePedalButtonProps {
  className?: string;
  placement?: "fixed" | "inline";
  hideBelowLg?: boolean;
}

export function FloatingCreatePedalButton({
  className = "",
  placement = "fixed",
  hideBelowLg = false,
}: FloatingCreatePedalButtonProps) {
  const positionClass =
    placement === "inline" ? "relative" : "fixed bottom-20 right-4";
  const visibilityClass = hideBelowLg ? "hidden lg:flex" : "flex";

  return (
    <Link
      href="/pedals/create"
      className={`${positionClass} ${visibilityClass} z-[1010] h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#1B5E20] to-[#43A047] text-2xl font-light text-white shadow-lg shadow-primary/30 transition-opacity hover:opacity-95 active:opacity-90 focus:outline-none focus:ring-4 focus:ring-primary/30 ${className}`}
      aria-label="Criar novo pedal"
    >
      +
    </Link>
  );
}
