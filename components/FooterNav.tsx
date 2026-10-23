"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BikeIcon } from "@/components/pedals/my-pedals-icons";

function MapIcon({ className }: { className?: string }) {
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
      <path d="M9 18 4.5 20.5 2 19V6l3-1.5L9 7l6-3 4.5 2L22 6v13l-3 1.5L15 18l-6 3Z" />
      <path d="M9 7v11M15 4v14" />
    </svg>
  );
}

function RotasIcon({ className }: { className?: string }) {
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
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  );
}

function LojasIcon({ className }: { className?: string }) {
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
      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
      <path d="M9 14h.01" />
      <path d="M15 14h.01" />
      <path d="M9 18h.01" />
      <path d="M15 18h.01" />
    </svg>
  );
}

function MapAlertsIcon({ className }: { className?: string }) {
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
      <path d="M12 18V5" />
      <path d="M15 13a4 4 0 0 0-6 0" />
      <path d="M12 2v1" />
      <circle cx="12" cy="18" r="3" />
      <path d="M4.5 10h2" />
      <path d="M17.5 10h2" />
    </svg>
  );
}

const NAV_ITEMS = [
  {
    href: "/home",
    label: "Pedais perto",
    shortLabel: "Perto",
    match: (p: string) => p === "/home",
    Icon: MapIcon,
  },
  {
    href: "/pedals/mine",
    label: "Meus pedais",
    shortLabel: "Meus",
    match: (p: string) => p === "/pedals/mine",
    Icon: BikeIcon,
  },
  {
    href: "/routes",
    label: "Rotas",
    shortLabel: "Rotas",
    match: (p: string) => p.startsWith("/routes"),
    Icon: RotasIcon,
  },
  {
    href: "/map-alerts",
    label: "Alertas",
    shortLabel: "Alertas",
    match: (p: string) => p === "/map-alerts",
    Icon: MapAlertsIcon,
  },
  {
    href: "/bike-shops",
    label: "Lojas",
    shortLabel: "Lojas",
    match: (p: string) => p === "/bike-shops",
    Icon: LojasIcon,
  },
] as const;

/** Padding interno da barra (p-1.5 = 0.375rem de cada lado). */
const BAR_PADDING = "0.375rem";

/**
 * Barra de navegação flutuante em vidro (estilo iOS): cápsula translúcida com
 * desfoque do conteúdo atrás e um destaque que desliza até a aba ativa.
 */
export function FooterNav() {
  const pathname = usePathname();
  const activeIndex = NAV_ITEMS.findIndex((item) => item.match(pathname));

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 z-[1000] px-3"
      style={{ bottom: "var(--footer-nav-offset)" }}
      aria-label="Navegação principal"
    >
      <div
        className="pointer-events-auto relative mx-auto flex w-full max-w-md items-stretch rounded-[1.75rem] border border-white/60 bg-white/90 p-1.5 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35),0_2px_6px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-[1.8] supports-[backdrop-filter]:bg-white/65 sm:max-w-lg"
        style={{ height: "var(--footer-nav-height)" }}
      >
        {/* Destaque da aba ativa (desliza entre as abas). */}
        <span
          className={`absolute rounded-[1.375rem] bg-primary/10 ring-1 ring-primary/10 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
            activeIndex < 0 ? "opacity-0" : "opacity-100"
          }`}
          style={{
            top: BAR_PADDING,
            bottom: BAR_PADDING,
            left: BAR_PADDING,
            width: `calc((100% - 2 * ${BAR_PADDING}) / ${NAV_ITEMS.length})`,
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
          }}
          aria-hidden
        />
        {NAV_ITEMS.map(({ href, label, shortLabel, match, Icon }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1.375rem] px-0.5 transition-[color,transform] duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-reduce:transform-none ${
                active ? "text-primary" : "text-gray-500 hover:text-foreground"
              }`}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={`h-[22px] w-[22px] shrink-0 transition-transform duration-300 ${
                  active ? "scale-110" : ""
                }`}
              />
              <span
                className={`max-w-full truncate text-center text-[10.5px] leading-none sm:text-xs ${
                  active ? "font-bold" : "font-medium"
                }`}
              >
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
