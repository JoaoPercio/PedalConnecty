"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import { getProfile, setCachedProfile } from "@/lib/profile";
import { isProfileRegistrationComplete } from "@/lib/profile-registration";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

function AppIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-14 h-14 sm:w-16 sm:h-16"
      aria-hidden
    >
      <circle cx="32" cy="32" r="30" fill="url(#iconGrad)" />
      <path
        d="M22 40c0-5 4-8 10-8s10 3 10 8M32 32v-6M28 26l4-4 4 4M32 38c-2 0-4 1.5-4 4h8c0-2.5-2-4-4-4z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="24" cy="44" r="4" fill="white" />
      <circle cx="40" cy="44" r="4" fill="white" />
      <defs>
        <linearGradient id="iconGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1B5E20" />
          <stop offset="1" stopColor="#43A047" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[400px] bg-surface rounded-2xl shadow-lg shadow-black/5 p-6 sm:p-8">
        {/* Ícone e título */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <AppIcon />
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            PedalConnect
          </h1>
          <p className="text-sm text-text-secondary">Entre na sua conta</p>
        </div>

        <div className="flex flex-col gap-4 mb-2">
          <GoogleSignInButton disabled={loading} />
          <div className="relative flex items-center justify-center">
            <span className="absolute inset-x-0 top-1/2 h-px bg-gray-200" aria-hidden />
            <span className="relative bg-surface px-3 text-xs text-text-secondary uppercase tracking-wide">
              ou
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-surface text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow text-base"
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Senha
            </label>
            <input
              id="password"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-surface text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow text-base"
            />
          </div>

          <div className="flex justify-end">
            <Link
              href="/login/forgot-password"
              className="text-sm text-primary hover:text-secondary transition-colors"
            >
              Esqueci a senha
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-medium text-white bg-gradient-to-r from-[#1B5E20] to-[#43A047] hover:opacity-95 active:opacity-90 disabled:opacity-70 transition-opacity shadow-md shadow-primary/20"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Não tem uma conta?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:text-secondary transition-colors"
          >
            Registrar
          </Link>
        </p>
      </div>
    </div>
  );
}
