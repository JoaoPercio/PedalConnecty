"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "./icons";

const fieldClass =
  "w-full rounded-xl border border-gray-200 bg-surface py-3 pl-11 pr-4 text-base text-foreground placeholder:text-text-secondary transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type AuthFieldProps = {
  id?: string;
  type?: "email" | "text";
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
};

export function AuthField({
  id,
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
  required,
  disabled,
}: AuthFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const Icon = type === "email" ? MailIcon : MailIcon;

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary">
          <Icon className="h-5 w-5" />
        </span>
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={fieldClass}
        />
      </div>
    </div>
  );
}

type AuthPasswordFieldProps = {
  id?: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
};

export function AuthPasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
  required,
  disabled,
}: AuthPasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary">
          <LockIcon className="h-5 w-5" />
        </span>
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={`${fieldClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-foreground"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}
