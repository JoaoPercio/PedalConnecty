const CACHE_KEY_LAT = "user_lat";
const CACHE_KEY_LNG = "user_lng";

/** Centro aproximado do Brasil — apenas para exibir o mapa quando não há coordenadas; não representa a posição do usuário. */
export const MAP_INITIAL_VIEW_CENTER: [number, number] = [-14.235, -51.9253];

/** Mensagem quando a localização não pôde ser obtida (permissão negada, API indisponível ou tempo esgotado). */
export const LOCATION_PERMISSION_MESSAGE =
  "Não foi possível obter sua localização. Permita o acesso à localização nas configurações do navegador ou do dispositivo para continuar.";

export function getCachedUserPosition(): [number, number] | null {
  if (typeof window === "undefined") return null;
  try {
    const lat = localStorage.getItem(CACHE_KEY_LAT);
    const lng = localStorage.getItem(CACHE_KEY_LNG);
    if (lat === null || lng === null) return null;
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (Number.isNaN(latN) || Number.isNaN(lngN)) return null;
    return [latN, lngN];
  } catch {
    return null;
  }
}

export function setCachedUserPosition(lat: number, lng: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY_LAT, String(lat));
    localStorage.setItem(CACHE_KEY_LNG, String(lng));
  } catch {
    // ignore
  }
}

/**
 * Obtém a posição do usuário (ou restaura do cache local).
 * Rejeita se não houver API de geolocalização, permissão negada ou falha — não usa cidade fictícia.
 */
export function requestUserPosition(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    const cached = getCachedUserPosition();
    if (cached) {
      resolve(cached);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("GEOLOCATION_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCachedUserPosition(lat, lng);
        resolve([lat, lng]);
      },
      () => reject(new Error("GEOLOCATION_FAILED")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

/** Última posição em cache; `null` se ainda não houver. */
export function getMapCenter(): [number, number] | null {
  return getCachedUserPosition();
}
