"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function MeusPedaisIcon({ className }: { className?: string }) {
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
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function PedaisPertosIcon({ className }: { className?: string }) {
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
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M9 17.5h6M15 14l-3-5 2-4" />
      <path d="M9 14l3-5" />
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

const linkClass = (active: boolean) =>
  `flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
    active
      ? "text-primary"
      : "text-text-secondary hover:bg-gray-50 hover:text-foreground"
  }`;

export function FooterNav() {
  const pathname = usePathname();
  const isMine = pathname === "/pedals/mine";
  const isNearby = pathname === "/home";
  const isRoutes = pathname.startsWith("/routes");
  const isBikeShops = pathname === "/bike-shops";
  const isMapAlerts = pathname === "/map-alerts";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1000] flex items-center justify-around border-t border-gray-200 bg-surface py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
      aria-label="Navegação principal"
    >
      <Link
        href="/pedals/mine"
        className={linkClass(isMine)}
        aria-label="Meus Pedais"
        aria-current={isMine ? "page" : undefined}
      >
        <MeusPedaisIcon className="h-6 w-6" />
        <span className="text-xs font-medium">Meus Pedais</span>
      </Link>

      <Link
        href="/home"
        className={linkClass(isNearby)}
        aria-label="Pedais perto"
        aria-current={isNearby ? "page" : undefined}
      >
        <PedaisPertosIcon className="h-6 w-6" />
        <span className="text-xs font-medium">Pedais perto</span>
      </Link>

      <Link
        href="/routes"
        className={linkClass(isRoutes)}
        aria-label="Rotas"
        aria-current={isRoutes ? "page" : undefined}
      >
        <RotasIcon className="h-6 w-6" />
        <span className="text-xs font-medium">Rotas</span>
      </Link>

      <Link
        href="/map-alerts"
        className={linkClass(isMapAlerts)}
        aria-label="Alertas no mapa"
        aria-current={isMapAlerts ? "page" : undefined}
      >
        <MapAlertsIcon className="h-6 w-6" />
        <span className="text-xs font-medium">Alertas</span>
      </Link>

      <Link
        href="/bike-shops"
        className={linkClass(isBikeShops)}
        aria-label="Lojas"
        aria-current={isBikeShops ? "page" : undefined}
      >
        <LojasIcon className="h-6 w-6" />
        <span className="text-xs font-medium">Lojas</span>
      </Link>
    </nav>
  );
}
