"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./notifications/NotificationBell";
import { ProfileModal } from "./ProfileModal";
import { AvatarImg } from "./AvatarImg";

export function Navbar() {
  const { profileCache } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const avatarUrl = profileCache?.avatarUrl ?? null;

  return (
    <header className="sticky top-0 z-[1200] flex h-14 items-center justify-between border-b border-gray-200 bg-surface px-4 shadow-sm">
      <button
        type="button"
        onClick={() => setProfileModalOpen(true)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Abrir perfil"
      >
        <AvatarImg src={avatarUrl} className="h-full w-full object-cover" />
      </button>

      <NotificationBell />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  );
}
