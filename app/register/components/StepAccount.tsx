"use client";

import type { StepAccount as Data } from "@/types/registration";
import { AvatarUpload } from "./AvatarUpload";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-surface text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow text-base";

interface StepAccountProps {
  data: Data;
  onChange: (data: Data) => void;
  errors: Partial<Record<keyof Data, string>>;
  avatarPreviewUrl: string | null;
  disabled?: boolean;
}

export function StepAccount({
  data,
  onChange,
  errors,
  avatarPreviewUrl,
  disabled,
}: StepAccountProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="block text-sm font-medium text-foreground mb-2">
          Foto de perfil (opcional)
        </span>
        <AvatarUpload
          previewUrl={avatarPreviewUrl}
          onFileChange={(file) => onChange({ ...data, avatar_file: file })}
          disabled={disabled}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          className={inputClass}
          autoComplete="email"
          disabled={disabled}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
          Senha
        </label>
        <input
          id="password"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={data.password}
          onChange={(e) => onChange({ ...data, password: e.target.value })}
          className={inputClass}
          autoComplete="new-password"
          disabled={disabled}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
        )}
      </div>
    </div>
  );
}
