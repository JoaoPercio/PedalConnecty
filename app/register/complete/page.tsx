"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  StepPersonalInfo as Step1Data,
  StepSkillLevel as Step2Data,
} from "@/types/registration";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile } from "@/lib/profile";
import { isProfileRegistrationComplete } from "@/lib/profile-registration";
import { validateStep1PersonalInfo } from "@/lib/registration-validation";
import { completeOAuthRegistration } from "@/lib/oauth-registration";
import { StepIndicator } from "../components/StepIndicator";
import { StepPersonalInfo } from "../components/StepPersonalInfo";
import { StepSkillLevel } from "../components/StepSkillLevel";
import { AvatarUpload } from "../components/AvatarUpload";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthBrand } from "@/components/auth/AuthBrand";
import { AuthPrimaryButton } from "@/components/auth/AuthPrimaryButton";

function validateStep2(_data: Step2Data): Record<string, never> {
  return {};
}

export default function RegisterCompletePage() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    refreshProfileCache,
    signOut,
  } = useAuth();
  const [step, setStep] = useState(1);
  const [step1, setStep1] = useState<Step1Data>({
    first_name: "",
    last_name: "",
    birth_date: "",
    gender: "masculino",
  });
  const [step2, setStep2] = useState<Step2Data>({
    skill_level: "iniciante",
  });
  const [step1Errors, setStep1Errors] = useState<
    Partial<Record<keyof Step1Data, string>>
  >({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      const p = await getProfile(user.id);
      if (cancelled) return;
      if (p && isProfileRegistrationComplete(p)) {
        router.replace("/home");
        return;
      }
      setStep1((prev) => ({
        ...prev,
        first_name: p?.first_name?.trim() || prev.first_name,
        last_name: p?.last_name?.trim() || prev.last_name,
        gender:
          (p?.gender as Step1Data["gender"]) && ["masculino", "feminino", "outro"].includes(p!.gender!)
            ? (p!.gender as Step1Data["gender"])
            : prev.gender,
        birth_date: p?.birth_date || prev.birth_date,
      }));
      if (p?.skill_level && ["iniciante", "intermediario", "experiente", "profissional"].includes(p.skill_level)) {
        setStep2({ skill_level: p.skill_level as Step2Data["skill_level"] });
      }
      const url = p?.avatar_url ?? null;
      setExistingAvatarUrl(url);
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!avatarFile) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const avatarDisplayUrl = avatarFile ? filePreviewUrl : existingAvatarUrl;

  function handleAvatarChange(f: File | null) {
    setAvatarFile(f);
    if (f === null) {
      setExistingAvatarUrl(null);
    }
  }

  const setStep1Data = useCallback((data: Step1Data) => {
    setStep1(data);
    setStep1Errors({});
  }, []);

  const canGoNext = () => {
    if (step === 1) {
      const errs = validateStep1PersonalInfo(step1);
      setStep1Errors(errs);
      return Object.keys(errs).length === 0;
    }
    if (step === 2) {
      return Object.keys(validateStep2(step2)).length === 0;
    }
    return false;
  };

  const handleNext = () => {
    if (step >= 3) return;
    if (!canGoNext()) return;
    setSubmitError(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setSubmitError(null);
    }
  };

  const handleSubmit = async () => {
    if (submitLock.current || !user) return;
    submitLock.current = true;
    try {
      const errs = validateStep1PersonalInfo(step1);
      setStep1Errors(errs);
      if (Object.keys(errs).length > 0) {
        setStep(1);
        return;
      }
      setLoading(true);
      setSubmitError(null);
      const { error } = await completeOAuthRegistration(
        user.id,
        step1,
        step2.skill_level,
        avatarFile,
        existingAvatarUrl
      );
      if (error) {
        setSubmitError(error.message);
        return;
      }
      await refreshProfileCache();
      router.replace("/home");
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  };

  if (authLoading || !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text-secondary">Carregando…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AuthLayout maxWidthClass="max-w-[480px]" showFeatures={false}>
      <AuthBrand subtitle="Precisamos destes dados para usar o PedalConnect." />

      <StepIndicator
        currentStep={step}
        labels={["Dados pessoais", "Nível", "Foto"]}
      />

      <div className="mt-6 flex flex-col gap-6">
          {step === 1 && (
            <StepPersonalInfo
              data={step1}
              onChange={setStep1Data}
              errors={step1Errors}
            />
          )}
          {step === 2 && (
            <StepSkillLevel data={step2} onChange={setStep2} />
          )}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <span className="block text-sm font-medium text-foreground mb-1">
                Foto de perfil
              </span>
              <p className="text-sm text-text-secondary -mt-2 mb-2">
                Usamos a foto da sua conta Google. Pode trocar abaixo, se quiser.
              </p>
              <AvatarUpload
                previewUrl={avatarDisplayUrl}
                onFileChange={handleAvatarChange}
                disabled={loading}
              />
            </div>
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
            <AuthPrimaryButton type="button" onClick={handleNext} className="flex-1">
              Próximo
            </AuthPrimaryButton>
          ) : (
            <AuthPrimaryButton
              type="button"
              disabled={loading}
              onClick={() => void handleSubmit()}
              className="flex-1"
            >
              {loading ? "Salvando…" : "Concluir"}
            </AuthPrimaryButton>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-text-secondary">
        <button
          type="button"
          onClick={() => void signOut()}
          className="font-semibold text-primary transition-colors hover:text-secondary"
        >
          Sair da conta
        </button>
      </p>
    </AuthLayout>
  );
}
