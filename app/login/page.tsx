"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { signIn } from "@/lib/auth";
import { getProfile, setCachedProfile } from "@/lib/profile";
import { isProfileRegistrationComplete } from "@/lib/profile-registration";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthField, AuthPasswordField } from "@/components/auth/AuthField";
import { AuthPrimaryButton } from "@/components/auth/AuthPrimaryButton";

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    profileGateLoading,
    registrationComplete,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || profileGateLoading) return;
    if (!user) return;
    router.replace(registrationComplete ? "/home" : "/register/complete");
  }, [
    user,
    authLoading,
    profileGateLoading,
    registrationComplete,
    router,
  ]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    const userId = data?.user?.id;
    const userEmail = data?.user?.email ?? email;
    if (userId) {
      const profile = await getProfile(userId);
      if (!isProfileRegistrationComplete(profile)) {
        router.replace("/register/complete");
        return;
      }
      const fullName = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Usuário"
        : "Usuário";
      setCachedProfile({
        userId,
        email: userEmail,
        fullName,
        avatarUrl: profile?.avatar_url ?? null,
        completedPedalsCount: profile?.completed_pedals_count ?? 0,
      });
    }
    router.replace("/home");
  }

  return (
    <AuthLayout>
      <AuthBrand subtitle="Entre na sua conta" priority />

      <div className="mb-6 flex flex-col gap-4">
        <GoogleSignInButton disabled={loading} />
        <AuthDivider />
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-5">
        <AuthField
          type="email"
          label="E-mail"
          placeholder="Seu e-mail"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
          disabled={loading}
        />

        <div className="flex flex-col gap-2">
          <AuthPasswordField
            label="Senha"
            placeholder="Sua senha"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
            disabled={loading}
          />
          <div className="flex justify-end">
            <Link
              href="/login/forgot-password"
              className="text-sm font-medium text-primary transition-colors hover:text-secondary"
            >
              Esqueci a senha
            </Link>
          </div>
        </div>

        <AuthPrimaryButton disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </AuthPrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Não tem uma conta?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary transition-colors hover:text-secondary"
        >
          Criar conta
        </Link>
      </p>
    </AuthLayout>
  );
}
