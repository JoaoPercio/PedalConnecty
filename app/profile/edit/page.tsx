"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile, updateProfile, uploadAvatar, setCachedProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import type { Gender, SkillLevel } from "@/types/registration";
import { AvatarUpload } from "@/app/register/components/AvatarUpload";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
];

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "experiente", label: "Experiente" },
  { value: "profissional", label: "Profissional" },
];

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-surface text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow text-base";

const labelClass = "block text-sm font-medium text-foreground mb-1.5";

export default function ProfileEditPage() {
  const { user, loading: authLoading, refreshProfileCache } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState<Gender>("outro");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("iniciante");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;

    (async () => {
      const profile = await getProfile(user.id);
      if (profile) {
        setName([profile.first_name, profile.last_name].filter(Boolean).join(" "));
        setCity(profile.city ?? "");
        setGender((profile.gender as Gender) ?? "outro");
        setSkillLevel((profile.skill_level as SkillLevel) ?? "iniciante");
        setCurrentAvatarUrl(profile.avatar_url);
      }
      setEmail(user.email ?? "");
      setLoading(false);
    })();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreviewUrl(null);
  }, [avatarFile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const pw = password.trim();
    const pwConfirm = passwordConfirm.trim();
    if (pw || pwConfirm) {
      if (pw.length < 6) {
        setError("A nova senha deve ter no mínimo 6 caracteres.");
        return;
      }
      if (pw !== pwConfirm) {
        setError("As senhas não coincidem.");
        return;
      }
    }

    setSaving(true);

    try {
      let avatarUrl: string | null = currentAvatarUrl;

      if (avatarFile) {
        const { avatarUrl: uploaded, error: uploadErr } = await uploadAvatar(
          user.id,
          avatarFile
        );
        if (uploadErr) {
          setError(uploadErr.message);
          setSaving(false);
          return;
        }
        avatarUrl = uploaded;
      }

      const { error: updateErr } = await updateProfile(user.id, {
        avatar_url: avatarUrl,
        city: city || null,
        gender,
        skill_level: skillLevel,
      });

      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }

      if (pw) {
        const { error: pwdErr } = await supabase.auth.updateUser({
          password: pw,
        });
        if (pwdErr) {
          setError(pwdErr.message);
          setSaving(false);
          return;
        }
      }

      const freshProfile = await getProfile(user.id);
      setCachedProfile({
        userId: user.id,
        email: user.email ?? "",
        fullName: name,
        avatarUrl,
        completedPedalsCount: freshProfile?.completed_pedals_count ?? 0,
      });
      await refreshProfileCache();
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text-secondary">Carregando…</p>
      </div>
    );
  }

  if (!user) return null;

  const previewUrl = avatarPreviewUrl ?? currentAvatarUrl;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/home"
            className="text-text-secondary hover:text-foreground"
            aria-label="Voltar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
            >
              <path
                fillRule="evenodd"
                d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-foreground">Editar perfil</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label className={labelClass}>Nome</label>
            <input
              type="text"
              value={name}
              readOnly
              className={inputClass + " bg-gray-50 cursor-not-allowed"}
              aria-readonly
            />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className={inputClass + " bg-gray-50 cursor-not-allowed"}
              aria-readonly
            />
          </div>

          <div>
            <label className={labelClass}>Avatar</label>
            <AvatarUpload
              previewUrl={previewUrl}
              onFileChange={setAvatarFile}
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="city" className={labelClass}>
              Cidade
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
              placeholder="Ex: São Paulo"
            />
          </div>

          <div>
            <label htmlFor="gender" className={labelClass}>
              Gênero
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className={inputClass}
            >
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="skill_level" className={labelClass}>
              Nível de habilidade
            </label>
            <select
              id="skill_level"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
              className={inputClass}
            >
              {SKILL_LEVELS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Nova senha (deixe em branco para não alterar)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="password_confirm" className={labelClass}>
              Confirmar nova senha
            </label>
            <input
              id="password_confirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={inputClass}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl font-medium text-white bg-gradient-to-r from-[#1B5E20] to-[#43A047] hover:opacity-95 active:opacity-90 disabled:opacity-70 transition-opacity shadow-md shadow-primary/20"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}
