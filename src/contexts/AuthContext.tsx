"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  getCachedProfile,
  setCachedProfile,
  clearCachedProfile,
  getProfile,
  type CachedProfile,
} from "@/lib/profile";
import { signOut as authSignOut } from "@/lib/auth";

interface AuthState {
  user: User | null;
  profileCache: CachedProfile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshProfileCache: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileCache, setProfileCache] = useState<CachedProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfileCache = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const u = data?.session?.user;
    if (!u) return;
    const cached = getCachedProfile();
    if (cached?.userId === u.id && cached.avatarUrl) {
      setProfileCache(cached);
      return;
    }
    let profile = await getProfile(u.id);
    if (!profile) {
      // First login right after register can race profile/storage availability.
      await new Promise((resolve) => setTimeout(resolve, 250));
      profile = await getProfile(u.id);
    }
    const fullName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Usuário"
      : "Usuário";
    const next: CachedProfile = {
      userId: u.id,
      email: u.email ?? "",
      fullName,
      avatarUrl: profile?.avatar_url ?? null,
      completedPedalsCount: profile?.completed_pedals_count ?? 0,
    };
    setCachedProfile(next);
    setProfileCache(next);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user ?? null;
      setUser(u);
      if (u) {
        const cached = getCachedProfile();
        if (cached?.userId === u.id) {
          setProfileCache(cached);
        } else {
          refreshProfileCache();
        }
      } else {
        setProfileCache(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) {
        setProfileCache(null);
        clearCachedProfile();
      } else {
        // Always refresh on sign-in to avoid stale first-login avatar cache.
        if (event === "SIGNED_IN") {
          refreshProfileCache();
          return;
        }
        const cached = getCachedProfile();
        if (cached?.userId === u.id && cached.avatarUrl) setProfileCache(cached);
        else refreshProfileCache();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshProfileCache]);

  const signOut = useCallback(async () => {
    await authSignOut();
    clearCachedProfile();
    setUser(null);
    setProfileCache(null);
    router.replace("/login");
  }, [router]);

  const value: AuthContextValue = {
    user,
    profileCache,
    loading,
    signOut,
    refreshProfileCache,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
