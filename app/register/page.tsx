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
import { AppLogo } from "@/components/AppLogo";

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
  /** Evita mostrar erros do passo 3 até envio explícito (submit ou botão). */
  const [step3SubmitTried, setStep3SubmitTried] = useState(false);
  /** Evita clique fantasma no mesmo pixel ao trocar "Próximo" por "Criar conta". */
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

  /** "Criar conta" é type="button" para o mouseup do "Próximo" não disparar envio; Enter usa onSubmit. */
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[480px] bg-surface rounded-2xl shadow-lg shadow-black/5 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-2 mb-2">
          <AppLogo className="h-12 w-12 sm:h-14 sm:w-14" priority />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
            PedalConnect
          </h1>
          <p className="text-sm text-text-secondary">Criar conta</p>
        </div>

        <StepIndicator currentStep={step} />

        <form noValidate onSubmit={handleFormSubmit} className="flex flex-col gap-6">
          {step === 1 && (
            <>
              <GoogleSignInButton disabled={loading} />
              <div className="relative flex items-center justify-center">
                <span
                  className="absolute inset-x-0 top-1/2 h-px bg-gray-200"
                  aria-hidden
                />
                <span className="relative bg-surface px-3 text-xs text-text-secondary uppercase tracking-wide">
                  ou cadastre-se com email
                </span>
              </div>
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
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">
              {submitError}
            </p>
          )}

          <div className="flex gap-3 mt-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl font-medium text-foreground bg-gray-100 hover:bg-gray-200 disabled:opacity-70 transition-colors"
              >
                Voltar
              </button>
            ) : (
              <div className="flex-1" />
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-3.5 rounded-xl font-medium text-white bg-gradient-to-r from-[#1B5E20] to-[#43A047] hover:opacity-95 active:opacity-90 transition-opacity shadow-md shadow-primary/20"
              >
                Próximo
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || !step3PrimaryReady}
                onClick={() => void submitStep3()}
                className="flex-1 py-3.5 rounded-xl font-medium text-white bg-gradient-to-r from-[#1B5E20] to-[#43A047] hover:opacity-95 active:opacity-90 disabled:opacity-70 transition-opacity shadow-md shadow-primary/20"
              >
                {loading ? "Criando conta…" : "Criar conta"}
              </button>
            )}
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-secondary transition-colors"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
