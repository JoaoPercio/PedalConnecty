const CACHE_KEY_LAT = "user_lat";
const CACHE_KEY_LNG = "user_lng";
const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];

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

export function requestUserPosition(): Promise<[number, number]> {
  return new Promise((resolve) => {
    const cached = getCachedUserPosition();
    if (cached) {
      resolve(cached);
      return;
    }
    if (!navigator.geolocation) {
      resolve(DEFAULT_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCachedUserPosition(lat, lng);
        resolve([lat, lng]);
      },
      () => resolve(DEFAULT_CENTER),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

export function getMapCenter(): [number, number] {
  return getCachedUserPosition() ?? DEFAULT_CENTER;
}

export { DEFAULT_CENTER };
