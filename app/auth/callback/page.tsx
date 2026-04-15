"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, setCachedProfile } from "@/lib/profile";
import { isProfileRegistrationComplete } from "@/lib/profile-registration";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Concluindo login…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { error: initError } = await supabase.auth.initialize();
      if (cancelled) return;

      if (initError) {
        setMessage("Não foi possível concluir o login.");
        router.replace("/login?error=oauth");
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionError || !session?.user) {
        setMessage("Não foi possível concluir o login.");
        router.replace("/login?error=oauth");
        return;
      }

      const userId = session.user.id;
      let profile = await getProfile(userId);
      if (!profile) {
        await new Promise((r) => setTimeout(r, 400));
        profile = await getProfile(userId);
      }

      if (cancelled) return;

      if (!isProfileRegistrationComplete(profile)) {
        router.replace("/register/complete");
        return;
      }

      const fullName = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          "Usuário"
        : "Usuário";
      setCachedProfile({
        userId,
        email: session.user.email ?? "",
        fullName,
        avatarUrl: profile?.avatar_url ?? null,
        completedPedalsCount: profile?.completed_pedals_count ?? 0,
      });
      router.replace("/home");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="text-text-secondary text-center">{message}</p>
    </div>
  );
}
