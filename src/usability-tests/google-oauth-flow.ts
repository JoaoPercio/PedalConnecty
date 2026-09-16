const GOOGLE_OAUTH_FLOW_KEY = "pc_usability_google_oauth";

export function markGoogleOAuthFlow(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(GOOGLE_OAUTH_FLOW_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

export function peekGoogleOAuthFlow(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(GOOGLE_OAUTH_FLOW_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearGoogleOAuthFlow(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(GOOGLE_OAUTH_FLOW_KEY);
  } catch {
    // ignore
  }
}

export function userHasGoogleIdentity(user: {
  app_metadata?: { provider?: string; providers?: string[] };
  identities?: { provider?: string }[] | null;
}): boolean {
  if (user.app_metadata?.provider === "google") return true;
  if (user.app_metadata?.providers?.includes("google")) return true;
  return Boolean(
    user.identities?.some((identity) => identity.provider === "google")
  );
}
