/**
 * Mapa base de todos os mapas do app.
 *
 * Com `NEXT_PUBLIC_CARTO_BASEMAP_KEY`, usa o estilo CARTO Voyager (mais limpo, os
 * pins destacam). Sem a chave, usa o OpenStreetMap padrão — o CARTO sem chave
 * mostra marca d'água "API key required".
 */

const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY?.trim() ?? "";

export const MAP_ATTRIBUTION_HTML = CARTO_KEY
  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function addBaseTileLayer(
  L: typeof import("leaflet"),
  map: L.Map
): L.TileLayer {
  if (CARTO_KEY) {
    return L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`,
      { attribution: MAP_ATTRIBUTION_HTML, subdomains: "abcd", maxZoom: 20 }
    ).addTo(map);
  }
  return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: MAP_ATTRIBUTION_HTML,
  }).addTo(map);
}
