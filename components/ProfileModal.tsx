"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultAvatar =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23616161'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profileCache, signOut } = useAuth();

  if (!isOpen || typeof document === "undefined") return null;

  const avatarUrl = profileCache?.avatarUrl ?? defaultAvatar;
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
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">{fullName}</p>
            <p className="text-sm text-text-secondary">{email}</p>
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
