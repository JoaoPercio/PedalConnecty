"use client";

import { useEffect, useState } from "react";
import { searchPlaces, type PlaceSearchResult } from "@/lib/geolocation";

interface LocationPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (place: PlaceSearchResult) => void;
  /** Quando presente, mostra o atalho "Usar minha localização atual" (volta ao GPS). */
  onUseCurrent?: () => void;
}

const MIN_QUERY = 3;
const DEBOUNCE_MS = 400;

/** Busca de cidade/bairro/endereço para quem não pode (ou não quer) liberar o GPS. */
export function LocationPickerModal({
  open,
  onClose,
  onSelect,
  onUseCurrent,
}: LocationPickerModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY;

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      searchPlaces(trimmed, controller.signal)
        .then((rows) => {
          setResults(rows);
          setError(rows.length === 0 ? "Nenhum lugar encontrado. Tente o nome da cidade." : null);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          console.error(err);
          setResults([]);
          setError("Não foi possível buscar agora. Verifique sua conexão.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-picker-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar"
        onClick={onClose}
      />

      <div className="relative flex max-h-[min(92dvh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-gray-200 bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 id="location-picker-title" className="text-lg font-semibold text-foreground">
            Escolher localização
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 hover:text-foreground"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="shrink-0 px-4 pt-4">
          {onUseCurrent ? (
            <button
              type="button"
              onClick={onUseCurrent}
              className="mb-4 flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left text-sm font-medium text-primary hover:bg-gray-50"
            >
              <span aria-hidden>🎯</span>
              Usar minha localização atual
            </button>
          ) : null}
          <label htmlFor="location-picker-input" className="mb-1.5 block text-sm text-text-secondary">
            Cidade, bairro ou endereço
          </label>
          <input
            autoFocus
            id="location-picker-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: Curitiba, PR"
            autoComplete="off"
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="min-h-[120px] flex-1 overflow-y-auto px-2 py-3" aria-live="polite">
          {tooShort ? (
            <p className="px-2 py-2 text-sm text-text-secondary">
              Digite pelo menos {MIN_QUERY} letras. Usaremos esse ponto para mostrar o que há por perto.
            </p>
          ) : searching ? (
            <p className="px-2 py-2 text-sm text-text-secondary">Buscando…</p>
          ) : error ? (
            <p className="px-2 py-2 text-sm text-text-secondary">{error}</p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={`${r.lat},${r.lng}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(r)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-foreground hover:bg-gray-100"
                  >
                    <span aria-hidden>📍</span>
                    <span>{r.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
