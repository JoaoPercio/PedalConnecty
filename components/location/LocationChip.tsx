"use client";

import { useState } from "react";
import { toast } from "sonner";
import { mapGlassClass } from "@/components/map/map-ui";
import type { UserLocationState } from "@/hooks/useUserLocation";
import { LocationPickerModal } from "./LocationPickerModal";

/**
 * Chip no topo dos mapas que mostra de onde vem a posição ("Curitiba, PR" ou
 * "Localização atual") e abre a busca para trocar de cidade ou voltar ao GPS.
 */
export function LocationChip({ location }: { location: UserLocationState }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const manual = location.source === "manual";
  const label = manual ? (location.label ?? "Local escolhido") : "Localização atual";

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label={`Localização: ${label}. Alterar`}
        className={`inline-flex min-h-9 max-w-[16rem] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-foreground transition active:scale-95 ${mapGlassClass}`}
      >
        <span aria-hidden>{manual ? "📍" : "🎯"}</span>
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-normal text-primary">· Alterar</span>
      </button>

      {/* Montado só quando aberto: a busca começa vazia a cada abertura. */}
      {pickerOpen && (
        <LocationPickerModal
          open
          onClose={() => setPickerOpen(false)}
          onSelect={(place) => {
            setPickerOpen(false);
            location.setManual(place.lat, place.lng, place.label);
          }}
          onUseCurrent={
            manual
              ? () => {
                  setPickerOpen(false);
                  void location.retry().then((ok) => {
                    if (!ok) {
                      toast.error(
                        "Não foi possível obter sua localização. Verifique a permissão do navegador."
                      );
                    }
                  });
                }
              : undefined
          }
        />
      )}
    </>
  );
}
