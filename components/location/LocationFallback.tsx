"use client";

import { useState } from "react";
import { locationErrorMessage, type LocationErrorKind } from "@/lib/geolocation";
import { LocationPickerModal } from "./LocationPickerModal";

interface LocationFallbackProps {
  errorKind: LocationErrorKind;
  onRetry: () => void;
  onManual: (lat: number, lng: number, label: string) => void;
}

/** Substitui o "beco sem saída" quando não há localização: tentar de novo ou escolher a cidade. */
export function LocationFallback({ errorKind, onRetry, onManual }: LocationFallbackProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-surface px-6 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl" aria-hidden>
        📍
      </span>
      <p className="max-w-md text-sm text-foreground">{locationErrorMessage(errorKind)}</p>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="w-full rounded-xl bg-primary py-3 font-medium text-white transition-opacity hover:opacity-95 active:opacity-90"
        >
          Escolher minha cidade
        </button>
        {errorKind !== "unavailable" && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 font-medium text-foreground hover:bg-gray-50"
          >
            Tentar novamente
          </button>
        )}
      </div>

      {errorKind === "denied" && (
        <p className="max-w-sm text-xs text-text-secondary">
          Para liberar: toque no ícone de cadeado ao lado do endereço do site, ative
          &quot;Localização&quot; e depois toque em &quot;Tentar novamente&quot;.
        </p>
      )}

      {/* Montado só quando aberto: a busca começa vazia a cada abertura. */}
      {pickerOpen && (
        <LocationPickerModal
          open
          onClose={() => setPickerOpen(false)}
          onSelect={(place) => {
            setPickerOpen(false);
            onManual(place.lat, place.lng, place.label);
          }}
        />
      )}
    </div>
  );
}
