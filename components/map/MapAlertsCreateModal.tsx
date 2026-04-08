"use client";

import { useEffect, useState } from "react";
import {
  MAP_ALERT_DESCRIPTION_MAX,
  MAP_ALERT_TYPE_OPTIONS,
  type MapAlertType,
} from "@/lib/map-alerts";

interface MapAlertsCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (type: MapAlertType, description: string) => Promise<void>;
  submitting: boolean;
}

export function MapAlertsCreateModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: MapAlertsCreateModalProps) {
  const [type, setType] = useState<MapAlertType>("danger");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setType("danger");
      setDescription("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    await onSubmit(type, trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-alert-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 transition-opacity duration-200"
        aria-label="Fechar"
        onClick={onClose}
      />

      <div className="relative flex w-full max-w-lg flex-col rounded-t-2xl border border-gray-200 bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 id="map-alert-modal-title" className="text-lg font-semibold text-foreground">
            Novo alerta
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-gray-100 hover:text-foreground"
            aria-label="Fechar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-4">
          <div>
            <label htmlFor="map-alert-type" className="mb-1.5 block text-sm font-medium text-foreground">
              Tipo
            </label>
            <select
              id="map-alert-type"
              value={type}
              onChange={(e) => setType(e.target.value as MapAlertType)}
              className="w-full rounded-xl border border-gray-200 bg-surface px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {MAP_ALERT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.emoji} {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="map-alert-desc" className="mb-1.5 block text-sm font-medium text-foreground">
              Descrição <span className="font-normal text-text-secondary">(opcional)</span>
            </label>
            <textarea
              id="map-alert-desc"
              value={description}
              maxLength={MAP_ALERT_DESCRIPTION_MAX}
              onChange={(e) => setDescription(e.target.value.slice(0, MAP_ALERT_DESCRIPTION_MAX))}
              rows={3}
              placeholder="Detalhes que ajudem outros ciclistas…"
              className="w-full resize-none rounded-xl border border-gray-200 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-right text-xs text-text-secondary">
              {description.length}/{MAP_ALERT_DESCRIPTION_MAX}
            </p>
          </div>

          <p className="text-xs text-text-secondary">
            O alerta será criado na sua posição atual e visível para ciclistas próximos até expirar.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {submitting ? "Salvando…" : "Publicar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
