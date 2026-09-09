"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { isUsabilityTestsEnabled } from "@/usability-tests/config";
import { getUsabilityTestById, usabilityTests } from "@/usability-tests/catalog";
import {
  reportUsabilityEvent,
  subscribeUsabilityEvents,
} from "@/usability-tests/events";
import { setUsabilityCurrentTestNumber } from "@/usability-tests/demo-notification";
import {
  isPedalDetailsPath,
  pageHasFooterNav,
  PEDAL_DETAILS_VIEW_MS,
} from "@/usability-tests/paths";
import { SupabaseTestProgressRepository } from "@/usability-tests/repository";
import { nextTestTitle, TestSessionService } from "@/usability-tests/service";
import type { TestSessionView } from "@/usability-tests/types";
import { UsabilityTestPanel } from "./UsabilityTestPanel";

const service = new TestSessionService(new SupabaseTestProgressRepository());

export function UsabilityTestHost() {
  const enabled = isUsabilityTestsEnabled();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<TestSessionView | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const hasFooter = pageHasFooterNav(pathname);
  const guest = !loading && !user;

  const loadState = useCallback(async (userId: string) => {
    const next = await service.load(userId);
    setState(next);
    setUsabilityCurrentTestNumber(next.currentTestNumber);
    return next;
  }, []);

  useEffect(() => {
    if (!enabled || !user?.id || !state) {
      if (!user?.id) setUsabilityCurrentTestNumber(null);
      return;
    }
    setUsabilityCurrentTestNumber(state.currentTestNumber);
  }, [enabled, user?.id, state]);

  useEffect(() => {
    if (!enabled) return;
    if (!user?.id) {
      userIdRef.current = null;
      setState(null);
      setUsabilityCurrentTestNumber(null);
      return;
    }
    let cancelled = false;
    userIdRef.current = user.id;
    void (async () => {
      try {
        await loadState(user.id);
        const signup = await service.tryCompleteSignupFromNewAccount(
          user.id,
          user.created_at
        );
        if (cancelled) return;
        if (signup.completedTestNumber) {
          setState(signup.state);
          announceCompletion(signup.state, signup.completedTestNumber);
        } else {
          setState(signup.state);
        }
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, user?.id, user?.created_at, loadState]);

  useEffect(() => {
    if (!enabled || !user?.id) return;
    userIdRef.current = user.id;
    return subscribeUsabilityEvents((event) => {
      const userId = userIdRef.current;
      if (!userId) return;
      void (async () => {
        try {
          const result = await service.handleEvent(userId, event);
          setState(result.state);
          if (result.completedTestNumber) {
            announceCompletion(result.state, result.completedTestNumber);
          }
        } catch (err) {
          console.error(err);
        }
      })();
    });
  }, [enabled, user?.id]);

  useEffect(() => {
    if (!enabled || !user?.id) return;
    if (!isPedalDetailsPath(pathname)) return;
    const pedalId = pathname.split("/").filter(Boolean)[1];
    if (!pedalId) return;
    const timer = window.setTimeout(() => {
      reportUsabilityEvent({ type: "pedal_details_viewed", pedalId });
    }, PEDAL_DETAILS_VIEW_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, user?.id, pathname]);

  const onSkipConfirm = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setBusy(true);
    try {
      const result = await service.skipCurrent(userId);
      setState(result.state);
      setSkipOpen(false);
      const nextTitle = nextTestTitle(result.state);
      toast.message("Teste registrado como não realizado.", {
        description: nextTitle
          ? `Próximo teste: ${nextTitle}.`
          : "Você finalizou os testes de usabilidade.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível registrar o teste.");
    } finally {
      setBusy(false);
    }
  }, []);

  const guestTest = useMemo(() => usabilityTests[0], []);

  if (!enabled || loading) return null;

  if (guest) {
    return (
      <UsabilityTestPanel
        guest
        currentNumber={1}
        total={usabilityTests.length}
        title={guestTest.title}
        description={guestTest.description}
        completedCount={0}
        skippedCount={0}
        finished={false}
        minimized={minimized}
        skipOpen={false}
        busy={false}
        hasFooter={false}
        onMinimize={() => setMinimized(true)}
        onExpand={() => setMinimized(false)}
        onSkipClick={() => undefined}
        onSkipCancel={() => undefined}
        onSkipConfirm={() => undefined}
      />
    );
  }

  if (!user || !state) return null;

  const current = state.currentTestNumber
    ? getUsabilityTestById(state.currentTestNumber)
    : null;

  return (
    <UsabilityTestPanel
      guest={false}
      currentNumber={state.currentTestNumber}
      total={usabilityTests.length}
      title={current?.title ?? ""}
      description={current?.description ?? ""}
      completedCount={state.completedCount}
      skippedCount={state.skippedCount}
      finished={state.finished}
      minimized={minimized}
      skipOpen={skipOpen}
      busy={busy}
      hasFooter={hasFooter}
      onMinimize={() => setMinimized(true)}
      onExpand={() => setMinimized(false)}
      onSkipClick={() => setSkipOpen(true)}
      onSkipCancel={() => setSkipOpen(false)}
      onSkipConfirm={() => void onSkipConfirm()}
    />
  );
}

function announceCompletion(state: TestSessionView, completedNumber: number) {
  const done = getUsabilityTestById(completedNumber);
  if (state.finished) {
    toast.success("Testes concluídos!", {
      description: `${state.completedCount} de 10 testes foram realizados.`,
    });
    return;
  }
  const next = nextTestTitle(state);
  toast.success("Teste concluído!", {
    description: next
      ? `Próximo teste: ${next}.`
      : done
        ? done.title
        : undefined,
  });
}
