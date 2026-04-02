"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AvatarImg } from "./AvatarImg";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profileCache, signOut } = useAuth();

  if (!isOpen || typeof document === "undefined") return null;

  const avatarUrl = profileCache?.avatarUrl ?? null;
  const fullName = profileCache?.fullName ?? "Usuário";
  const email = profileCache?.email ?? "";

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[6000] bg-black/40"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-[6001] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <h2 id="profile-modal-title" className="sr-only">
          Perfil do usuário
        </h2>

        <div className="flex flex-col items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-100">
            <AvatarImg src={avatarUrl} className="h-full w-full object-cover" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">{fullName}</p>
            <p className="text-sm text-text-secondary">{email}</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Pedais realizados: {profileCache?.completedPedalsCount ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/profile/edit"
            onClick={onClose}
            className="flex justify-center rounded-xl bg-primary py-3 font-medium text-white no-underline transition-opacity hover:opacity-95 active:opacity-90"
          >
            Editar perfil
          </Link>
          <button
            type="button"
            onClick={() => {
              onClose();
              signOut();
            }}
            className="rounded-xl border border-gray-200 py-3 font-medium text-foreground transition-colors hover:bg-gray-50"
          >
            Sair
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
