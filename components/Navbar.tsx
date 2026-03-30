"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./notifications/NotificationBell";
import { ProfileModal } from "./ProfileModal";

const defaultAvatar =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23616161'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

export function Navbar() {
  const { profileCache } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const avatarUrl = profileCache?.avatarUrl ?? defaultAvatar;

  return (
    <header className="sticky top-0 z-[1200] flex h-14 items-center justify-between border-b border-gray-200 bg-surface px-4 shadow-sm">
      <button
        type="button"
        onClick={() => setProfileModalOpen(true)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Abrir perfil"
      >
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </button>

      <NotificationBell />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  );
}
