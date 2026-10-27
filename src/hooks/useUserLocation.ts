"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LOCATION_CHANGED_EVENT,
  getCachedLocationLabel,
  getCachedLocationSource,
  getCachedUserPosition,
  getLocationErrorKind,
  requestFreshUserPosition,
  requestUserPosition,
  setManualUserPosition,
  type LocationErrorKind,
  type LocationSource,
} from "@/lib/geolocation";

export interface UserLocationState {
  position: [number, number] | null;
  loading: boolean;
  errorKind: LocationErrorKind | null;
  source: LocationSource | null;
  /** Nome do lugar quando a posição foi escolhida manualmente. */
  label: string | null;
  /** Pede a posição ao navegador de novo (ignora o cache); resolve `true` se conseguiu. */
  retry: () => Promise<boolean>;
  setManual: (lat: number, lng: number, label: string) => void;
}

/**
 * Posição do usuário compartilhada pelas telas: GPS, cache ou escolha manual.
 * Quando há falha, expõe `errorKind` para a tela oferecer "tentar de novo" ou escolha manual
 * em vez de travar.
 */
export function useUserLocation(): UserLocationState {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<LocationErrorKind | null>(null);
  const [source, setSource] = useState<LocationSource | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  const syncFromCache = useCallback(() => {
    const cached = getCachedUserPosition();
    if (!cached) return;
    // Mesma coordenada → mesma referência, para não recriar mapas à toa.
    setPosition((prev) =>
      prev && prev[0] === cached[0] && prev[1] === cached[1] ? prev : cached
    );
    setSource(getCachedLocationSource());
    setLabel(getCachedLocationLabel());
    setErrorKind(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    requestUserPosition()
      .then(() => {
        if (!cancelled) syncFromCache();
      })
      .catch((err) => {
        if (!cancelled) setErrorKind(getLocationErrorKind(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [syncFromCache]);

  // Mantém todas as telas montadas com a mesma posição (ex.: escolha manual em outra aba).
  useEffect(() => {
    window.addEventListener(LOCATION_CHANGED_EVENT, syncFromCache);
    window.addEventListener("storage", syncFromCache);
    return () => {
      window.removeEventListener(LOCATION_CHANGED_EVENT, syncFromCache);
      window.removeEventListener("storage", syncFromCache);
    };
  }, [syncFromCache]);

  // Uma posição manual só é trocada pelo GPS quando o usuário pede (chip ou "Tentar novamente"):
  // ele pode ter escolhido outra cidade de propósito, mesmo com a permissão liberada.
  const retry = useCallback(async () => {
    setLoading(true);
    setErrorKind(null);
    try {
      await requestFreshUserPosition();
      syncFromCache();
      return true;
    } catch (err) {
      setErrorKind(getLocationErrorKind(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, [syncFromCache]);

  const setManual = useCallback((lat: number, lng: number, placeLabel: string) => {
    setManualUserPosition(lat, lng, placeLabel);
    setLoading(false);
  }, []);

  return { position, loading, errorKind, source, label, retry, setManual };
}
