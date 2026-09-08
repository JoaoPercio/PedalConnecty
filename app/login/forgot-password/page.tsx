"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { AuthField } from "@/components/auth/AuthField";
import { AuthPrimaryButton } from "@/components/auth/AuthPrimaryButton";

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
    <AuthLayout showFeatures={false}>
      <AuthBrand
        subtitle={
          sent
            ? "Verifique seu e-mail"
            : "Informe seu e-mail para receber o link de redefinição"
        }
      />

      {!sent ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
          <AuthPrimaryButton disabled={loading}>
            {loading ? "Enviando…" : "Enviar link"}
          </AuthPrimaryButton>
        </form>
      ) : (
        <p className="text-center text-sm leading-relaxed text-text-secondary">
          Se existir uma conta com esse e-mail, você receberá um link para redefinir a senha.
        </p>
      )}

      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm font-semibold text-primary transition-colors hover:text-secondary"
        >
          Voltar ao login
        </Link>
      </p>
    </AuthLayout>
  );
}
