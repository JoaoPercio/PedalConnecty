"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProfileModal } from "@/components/ProfileModal";
import { AvatarImg } from "@/components/AvatarImg";
import { AppLogo } from "@/components/AppLogo";

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { profileCache } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const avatarUrl = profileCache?.avatarUrl ?? null;

  return (
    <header className="sticky top-0 z-[1200] shrink-0 border-b border-gray-200 bg-surface shadow-sm">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {onMenuClick ? (
            <button
              type="button"
              onClick={onMenuClick}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 lg:hidden"
              aria-label="Abrir filtros"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          ) : null}

          <Link
            href="/home"
            className="flex min-w-0 items-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <AppLogo className="h-8 w-8" />
            <span className="hidden truncate text-base font-bold text-primary sm:inline">
              PedalConnect
            </span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Abrir perfil"
          >
            <AvatarImg src={avatarUrl} className="h-full w-full object-cover" />
          </button>
        </div>
      </div>

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  );
}
