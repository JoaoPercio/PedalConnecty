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

function linkClass(active: boolean) {
  return `relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3 ${
    active
      ? "text-primary"
      : "text-text-secondary hover:bg-gray-50 hover:text-foreground"
  }`;
}

export function FooterNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-gray-200 bg-surface shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around py-1.5 sm:max-w-none">
        {NAV_ITEMS.map(({ href, label, shortLabel, match, Icon }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={linkClass(active)}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              {active ? (
                <span
                  className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
              <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
              <span className="max-w-full whitespace-nowrap text-center text-[10px] font-medium leading-none sm:text-xs">
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
