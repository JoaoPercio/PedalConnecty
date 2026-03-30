"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteRouteFavorite,
  insertRouteFavorite,
} from "@/lib/routes";

interface RouteFavoriteButtonProps {
  routeId: string;
  initialFavorited: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  onChange?: (favorited: boolean) => void;
}

export function RouteFavoriteButton({
  routeId,
  initialFavorited,
  size = "md",
  className = "",
  onChange,
}: RouteFavoriteButtonProps) {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);
  const [justToggled, setJustToggled] = useState(false);

  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited]);

  const iconSize =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-8 w-8" : "h-6 w-6";

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user || pending) return;

      const next = !favorited;
      setFavorited(next);
      setJustToggled(true);
      setPending(true);
      onChange?.(next);
      window.setTimeout(() => setJustToggled(false), 320);

      const { error } = next
        ? await insertRouteFavorite(routeId, user.id)
        : await deleteRouteFavorite(routeId, user.id);

      setPending(false);

      if (error) {
        setFavorited(!next);
        onChange?.(!next);
        console.error(error);
      }
    },
    [user, pending, favorited, routeId, onChange]
  );

  const disabled = !user || pending;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      aria-label={favorited ? "Remover dos favoritos" : "Salvar rota nos favoritos"}
      aria-pressed={favorited}
      className={`inline-flex shrink-0 items-center justify-center rounded-full p-1.5 text-primary transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 ${
        justToggled ? "scale-110" : "scale-100"
      } ${className}`}
      style={{
        transition: "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={`${iconSize} transition-[fill,stroke] duration-200 ${
          favorited ? "fill-primary stroke-primary" : "fill-none stroke-primary"
        }`}
        strokeWidth={favorited ? 0 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 21s-6.716-4.05-8.95-8.2C1.55 10.37 3.5 6.5 8 6.5c2.5 0 4 2 4 2s1.5-2 4-2c4.5 0 6.45 3.87 4.95 6.3C18.716 16.95 12 21 12 21Z" />
      </svg>
    </button>
  );
}
