import { countActiveFilters, type PedalFiltersState } from "@/lib/pedal-filters";
import { PEDAL_DETAILS_VIEW_MS } from "./config";

export function isPedalDetailsPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0] !== "pedals") return false;
  return !["create", "mine", "entrar"].includes(parts[1]);
}

export function pageHasFooterNav(pathname: string): boolean {
  if (pathname === "/home" || pathname.startsWith("/home/")) return true;
  if (pathname.startsWith("/pedals")) return true;
  if (pathname.startsWith("/routes")) return true;
  if (pathname === "/bike-shops" || pathname === "/map-alerts") return true;
  return false;
}

export function shouldCompleteFilterTest(
  filters: PedalFiltersState,
  listingReady: boolean
): boolean {
  return listingReady && countActiveFilters(filters) > 0;
}

export { PEDAL_DETAILS_VIEW_MS };
