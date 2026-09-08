"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  RegistrationFormData,
  StepPersonalInfo as Step1Data,
  StepSkillLevel as Step2Data,
  StepAccount as Step3Data,
} from "@/types/registration";
import { registerWithProfile } from "@/lib/registration";
import {
  validateStep1PersonalInfo,
} from "@/lib/registration-validation";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { StepIndicator } from "./components/StepIndicator";
import { StepPersonalInfo } from "./components/StepPersonalInfo";
import { StepSkillLevel } from "./components/StepSkillLevel";
import { StepAccount } from "./components/StepAccount";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthPrimaryButton } from "@/components/auth/AuthPrimaryButton";

const initialFormData: RegistrationFormData = {
  step1: {
    first_name: "",
    last_name: "",
    birth_date: "",
    gender: "masculino",
  },
  step2: {
    skill_level: "iniciante",
  },
  step3: {
    email: "",
    password: "",
    password_confirm: "",
    avatar_file: null,
  },
};

function validateStep1(data: Step1Data): Partial<Record<keyof Step1Data, string>> {
  return validateStep1PersonalInfo(data);
}

function validateStep2(_data: Step2Data): Record<string, never> {
  return {};
}

function validateStep3(data: Step3Data): Partial<Record<keyof Step3Data, string>> {
  const errors: Partial<Record<keyof Step3Data, string>> = {};
  if (!data.email?.trim()) errors.email = "Email é obrigatório.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Email inválido.";
  if (!data.password) errors.password = "Senha é obrigatória.";
  else if (data.password.length < 6) errors.password = "Senha deve ter no mínimo 6 caracteres.";
  if (!data.password_confirm) {
    errors.password_confirm = "Confirme sua senha.";
  } else if (data.password !== data.password_confirm) {
    errors.password_confirm = "As senhas não coincidem.";
  }
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RegistrationFormData>(initialFormData);
  const [step1Errors, setStep1Errors] = useState<Partial<Record<keyof Step1Data, string>>>({});
  const [step3Errors, setStep3Errors] = useState<Partial<Record<keyof Step3Data, string>>>({});
  const [step3SubmitTried, setStep3SubmitTried] = useState(false);
  const [step3PrimaryReady, setStep3PrimaryReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitStep3Lock = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (formData.step3.avatar_file) {
      const url = URL.createObjectURL(formData.step3.avatar_file);
      setAvatarPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreviewUrl(null);
  }, [formData.step3.avatar_file]);

  useEffect(() => {
    if (step !== 3) {
      setStep3PrimaryReady(false);
      return;
    }
    setStep3PrimaryReady(false);
    const t = window.setTimeout(() => setStep3PrimaryReady(true), 200);
    return () => window.clearTimeout(t);
  }, [step]);

  const setStep1 = useCallback((step1: Step1Data) => {
    setFormData((prev: RegistrationFormData) => ({ ...prev, step1 }));
    setStep1Errors({});
  }, []);

  const setStep2 = useCallback((step2: Step2Data) => {
    setFormData((prev: RegistrationFormData) => ({ ...prev, step2 }));
  }, []);

  const setStep3 = useCallback((step3: Step3Data) => {
    setFormData((prev: RegistrationFormData) => ({ ...prev, step3 }));
    setStep3Errors({});
  }, []);

  const canGoNext = () => {
    if (step === 1) {
      const errs = validateStep1(formData.step1);
      setStep1Errors(errs);
      return Object.keys(errs).length === 0;
    }
    if (step === 2) {
      const errs = validateStep2(formData.step2);
      return Object.keys(errs).length === 0;
    }
    return false;
  };

  const handleNext = () => {
    if (step >= 3) return;
    if (!canGoNext()) return;
    if (step === 2) {
      setStep3Errors({});
      setStep3SubmitTried(false);
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      if (step === 3) {
        setStep3Errors({});
        setStep3SubmitTried(false);
      }
      setStep(step - 1);
    }
    setSubmitError(null);
  };

  const submitStep3 = async () => {
    if (submitStep3Lock.current) return;
    submitStep3Lock.current = true;
    try {
      setStep3SubmitTried(true);
      const errs = validateStep3(formData.step3);
      setStep3Errors(errs);
      if (Object.keys(errs).length > 0) return;

      setLoading(true);
      setSubmitError(null);
      try {
        const { error } = await registerWithProfile(formData);
        if (error) {
          setSubmitError(error.message);
          return;
        }
        router.push("/login?registered=1");
      } finally {
        setLoading(false);
      }
    } finally {
      submitStep3Lock.current = false;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;
    void submitStep3();
  };

  return (
    <AuthLayout maxWidthClass="max-w-[480px]">
      <AuthBrand subtitle="Criar conta" priority />

      <StepIndicator currentStep={step} />

      <form noValidate onSubmit={handleFormSubmit} className="flex flex-col gap-6">
        {step === 1 && (
          <>
            <GoogleSignInButton disabled={loading} />
            <AuthDivider label="ou cadastre-se com email" />
            <StepPersonalInfo
              data={formData.step1}
              onChange={setStep1}
              errors={step1Errors}
            />
          </>
        )}
        {step === 2 && (
          <StepSkillLevel
            data={formData.step2}
            onChange={setStep2}
          />
        )}
        {step === 3 && (
          <StepAccount
            data={formData.step3}
            onChange={setStep3}
            errors={step3SubmitTried ? step3Errors : {}}
            avatarPreviewUrl={avatarPreviewUrl}
            disabled={loading}
          />
        )}

        {submitError && (
          <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
            {submitError}
          </p>
        )}

        <div className="mt-2 flex gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="flex-1 rounded-xl bg-gray-100 py-3.5 font-medium text-foreground transition-colors hover:bg-gray-200 disabled:opacity-70"
            >
              Voltar
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {step < 3 ? (
            <AuthPrimaryButton
              type="button"
              onClick={handleNext}
              className="flex-1"
            >
              Próximo
            </AuthPrimaryButton>
          ) : (
            <AuthPrimaryButton
              type="button"
              disabled={loading || !step3PrimaryReady}
              onClick={() => void submitStep3()}
              className="flex-1"
            >
              {loading ? "Criando conta…" : "Criar conta"}
            </AuthPrimaryButton>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Já tem uma conta?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary transition-colors hover:text-secondary"
        >
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
