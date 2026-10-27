const CACHE_KEY_LAT = "user_lat";
const CACHE_KEY_LNG = "user_lng";
/** "gps" quando veio do navegador; "manual" quando o usuário escolheu a cidade/endereço. */
const CACHE_KEY_SOURCE = "user_loc_source";
const CACHE_KEY_LABEL = "user_loc_label";

/** Evento disparado quando a posição salva muda (mantém as telas abertas sincronizadas). */
export const LOCATION_CHANGED_EVENT = "pedal:location-changed";

/** Centro aproximado do Brasil — apenas para exibir o mapa quando não há coordenadas; não representa a posição do usuário. */
export const MAP_INITIAL_VIEW_CENTER: [number, number] = [-14.235, -51.9253];

/** Aviso nos formulários com mapa quando não há posição: o usuário segue navegando o mapa à mão. */
export const LOCATION_PERMISSION_MESSAGE =
  "Não foi possível obter sua localização. Mova e aproxime o mapa até a região desejada.";

export type LocationSource = "gps" | "manual";

/**
 * - `denied`: o usuário (ou o navegador) recusou a permissão — o navegador não pergunta de novo.
 * - `unavailable`: sem API de geolocalização (navegador antigo, contexto não seguro).
 * - `failed`: permissão ok, mas o GPS não respondeu (tempo esgotado, sinal ruim, desktop sem Wi-Fi).
 */
export type LocationErrorKind = "denied" | "unavailable" | "failed";

export class LocationError extends Error {
  constructor(public readonly kind: LocationErrorKind) {
    super(`GEOLOCATION_${kind.toUpperCase()}`);
    this.name = "LocationError";
  }
}

export function getLocationErrorKind(err: unknown): LocationErrorKind {
  return err instanceof LocationError ? err.kind : "failed";
}

export function locationErrorMessage(kind: LocationErrorKind): string {
  switch (kind) {
    case "denied":
      return "O acesso à sua localização está bloqueado. Você pode liberar nas configurações do navegador ou escolher sua cidade manualmente.";
    case "unavailable":
      return "Seu navegador não oferece localização. Escolha sua cidade manualmente para continuar.";
    default:
      return "Não conseguimos encontrar sua localização agora. Tente novamente ou escolha sua cidade manualmente.";
  }
}

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

/** Origem da posição em cache; caches antigos (sem a chave) vieram do GPS. */
export function getCachedLocationSource(): LocationSource | null {
  if (!getCachedUserPosition()) return null;
  try {
    return localStorage.getItem(CACHE_KEY_SOURCE) === "manual" ? "manual" : "gps";
  } catch {
    return "gps";
  }
}

/** Nome do lugar escolhido manualmente (ex.: "Curitiba, PR"); `null` para GPS. */
export function getCachedLocationLabel(): string | null {
  if (getCachedLocationSource() !== "manual") return null;
  try {
    return localStorage.getItem(CACHE_KEY_LABEL);
  } catch {
    return null;
  }
}

function writeCache(lat: number, lng: number, source: LocationSource, label?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY_LAT, String(lat));
    localStorage.setItem(CACHE_KEY_LNG, String(lng));
    localStorage.setItem(CACHE_KEY_SOURCE, source);
    if (label) localStorage.setItem(CACHE_KEY_LABEL, label);
    else localStorage.removeItem(CACHE_KEY_LABEL);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(LOCATION_CHANGED_EVENT));
}

export function setCachedUserPosition(lat: number, lng: number): void {
  writeCache(lat, lng, "gps");
}

/** Salva uma posição escolhida pelo usuário; vale para todas as telas até ele usar o GPS. */
export function setManualUserPosition(lat: number, lng: number, label: string): void {
  writeCache(lat, lng, "manual", label);
}

function getPosition(options: PositionOptions): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      (err) =>
        reject(new LocationError(err.code === err.PERMISSION_DENIED ? "denied" : "failed")),
      options
    );
  });
}

/** Pede a posição ao navegador, ignorando o cache. Salva o resultado como GPS. */
export async function requestFreshUserPosition(): Promise<[number, number]> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new LocationError("unavailable");
  }
  let pos: [number, number];
  try {
    pos = await getPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
  } catch (err) {
    if (getLocationErrorKind(err) === "denied") throw err;
    // Alta precisão costuma estourar o tempo em ambientes fechados ou no desktop;
    // a posição por Wi-Fi/rede é suficiente para listar o que há por perto.
    pos = await getPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }
  setCachedUserPosition(pos[0], pos[1]);
  return pos;
}

/**
 * Obtém a posição do usuário (ou restaura do cache local, inclusive a escolhida manualmente).
 * Rejeita com `LocationError` se não houver API, permissão negada ou falha — não usa cidade fictícia.
 */
export function requestUserPosition(): Promise<[number, number]> {
  const cached = getCachedUserPosition();
  if (cached) return Promise.resolve(cached);
  return requestFreshUserPosition();
}

/** Última posição em cache; `null` se ainda não houver. */
export function getMapCenter(): [number, number] | null {
  return getCachedUserPosition();
}

export interface PlaceSearchResult {
  label: string;
  lat: number;
  lng: number;
}

/** Busca cidades/endereços no Brasil (via /api/geocode → Nominatim). */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSearchResult[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error("GEOCODE_FAILED");
  const data = (await res.json()) as { results?: PlaceSearchResult[] };
  return data.results ?? [];
}
