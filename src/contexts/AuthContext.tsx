"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  setCachedProfile,
  clearCachedProfile,
  getCachedProfile,
  getProfile,
  type CachedProfile,
} from "@/lib/profile";
import { isProfileRegistrationComplete } from "@/lib/profile-registration";
import { isExemptFromRegistrationGate } from "@/lib/auth-paths";
import { signOut as authSignOut } from "@/lib/auth";

interface AuthState {
  user: User | null;
  profileCache: CachedProfile | null;
  loading: boolean;
}

interface ProfileGateState {
  loading: boolean;
  isComplete: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshProfileCache: () => Promise<void>;
  /** Só relevante com sessão: perfil tem cadastro completo. */
  registrationComplete: boolean;
  /** A carregar estado do perfil para o gate (rotas protegidas). */
  profileGateLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const initialSessionHandled = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileCache, setProfileCacheState] = useState<CachedProfile | null>(
    () => (typeof window !== "undefined" ? getCachedProfile() : null)
  );
  const [loading, setLoading] = useState(true);
  const [profileGate, setProfileGate] = useState<ProfileGateState>({
    loading: false,
    isComplete: true,
  });

  const syncProfileGateFromRow = useCallback(
    (profile: Awaited<ReturnType<typeof getProfile>>) => {
      setProfileGate({
        loading: false,
        isComplete: isProfileRegistrationComplete(profile),
      });
    },
    []
  );

  const refreshProfileCache = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const u = data?.session?.user;
    if (!u) return;
    let profile = await getProfile(u.id);
    if (!profile) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      profile = await getProfile(u.id);
    }
    syncProfileGateFromRow(profile);
    const fullName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
        "Usuário"
      : "Usuário";
    const next: CachedProfile = {
      userId: u.id,
      email: u.email ?? "",
      fullName,
      avatarUrl: profile?.avatar_url ?? null,
      completedPedalsCount: profile?.completed_pedals_count ?? 0,
    };
    setCachedProfile(next);
    setProfileCacheState(next);
  }, [syncProfileGateFromRow]);

  useEffect(() => {
    let cancelled = false;

    const applySignedOut = () => {
      setUser(null);
      setProfileCacheState(null);
      clearCachedProfile();
      setProfileGate({ loading: false, isComplete: true });
    };

    const applySignedIn = (u: User, loadProfile: boolean) => {
      setUser(u);
      if (!loadProfile) return;
      setProfileGate({ loading: true, isComplete: false });
      void refreshProfileCache();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      const u = session?.user ?? null;

      if (event === "INITIAL_SESSION") {
        initialSessionHandled.current = true;
        if (u) {
          applySignedIn(u, true);
        } else {
          applySignedOut();
        }
        setLoading(false);
        return;
      }

      if (event === "SIGNED_OUT" || !u) {
        applySignedOut();
        return;
      }

      if (event === "SIGNED_IN") {
        applySignedIn(u, true);
        return;
      }

      if (event === "USER_UPDATED") {
        setUser(u);
        void refreshProfileCache();
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        setUser(u);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || initialSessionHandled.current) return;
      const u = data?.session?.user ?? null;
      if (u) {
        applySignedIn(u, true);
      } else {
        applySignedOut();
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshProfileCache]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (profileGate.loading) return;

    if (profileGate.isComplete && pathname === "/register/complete") {
      router.replace("/home");
      return;
    }

    if (
      !profileGate.isComplete &&
      !isExemptFromRegistrationGate(pathname, true)
    ) {
      router.replace("/register/complete");
    }
  }, [user, loading, profileGate, pathname, router]);

  const showGateOverlay =
    !!user &&
    profileGate.loading &&
    !isExemptFromRegistrationGate(pathname, true);

  const signOut = useCallback(async () => {
    await authSignOut();
    clearCachedProfile();
    setUser(null);
    setProfileCacheState(null);
    setProfileGate({ loading: false, isComplete: true });
    router.replace("/login");
  }, [router]);

  const value: AuthContextValue = {
    user,
    profileCache,
    loading,
    signOut,
    refreshProfileCache,
    registrationComplete: profileGate.isComplete,
    profileGateLoading: profileGate.loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showGateOverlay ? (
        <div
          className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-background"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="text-text-secondary">Carregando…</p>
        </div>
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
