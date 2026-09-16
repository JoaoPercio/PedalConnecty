"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  canStartClarity,
  getClarityProjectId,
  getClarityService,
  isClarityEnabled,
  readClarityConsent,
  writeClarityConsent,
} from "@/clarity";
import type { ClarityConsentDecision } from "@/clarity";
import { ClarityConsentBanner } from "./ClarityConsentBanner";

export function ClarityHost() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [consent, setConsent] = useState<ClarityConsentDecision | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(readClarityConsent());
    setReady(true);
    if (
      process.env.NODE_ENV === "development" &&
      isClarityEnabled() &&
      !getClarityProjectId()
    ) {
      console.warn(
        "[Clarity] NEXT_PUBLIC_ENABLE_CLARITY=true, mas o Project ID não está configurado."
      );
    }
  }, []);

  useEffect(() => {
    if (!isClarityEnabled()) return;
    if (consent !== "granted") return;
    const clarity = getClarityService();
    clarity.grantAnalyticsConsent();
    if (user?.id) clarity.identifyUser(user.id);
    else clarity.identifyAnonymous();
  }, [consent, user?.id, pathname]);

  if (!canStartClarity() || !ready) return null;
  if (consent != null) return null;

  return (
    <ClarityConsentBanner
      onAccept={() => {
        writeClarityConsent("granted");
        setConsent("granted");
      }}
      onDecline={() => {
        writeClarityConsent("denied");
        getClarityService().denyConsent();
        setConsent("denied");
      }}
    />
  );
}
