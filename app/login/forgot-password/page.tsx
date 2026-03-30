"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      alert(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[400px] bg-surface rounded-2xl shadow-lg shadow-black/5 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Esqueci a senha
          </h1>
          <p className="text-sm text-text-secondary text-center">
            {sent
              ? "Se existir uma conta com esse email, você receberá um link para redefinir a senha."
              : "Informe seu email para receber o link de redefinição."}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-medium text-white bg-gradient-to-r from-[#1B5E20] to-[#43A047] hover:opacity-95 active:opacity-90 disabled:opacity-70 transition-opacity shadow-md shadow-primary/20"
            >
              {loading ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        ) : null}

        <p className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:text-secondary transition-colors"
          >
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
