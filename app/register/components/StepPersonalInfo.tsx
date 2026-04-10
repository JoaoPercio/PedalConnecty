"use client";

import type { StepPersonalInfo as Data, Gender } from "@/types/registration";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-surface text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow text-base";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
];

/** Última data de nascimento permitida para ter 18 anos completos hoje (YYYY-MM-DD). */
function maxBirthDateForMinAge18(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface StepPersonalInfoProps {
  data: Data;
  onChange: (data: Data) => void;
  errors: Partial<Record<keyof Data, string>>;
}

export function StepPersonalInfo({
  data,
  onChange,
  errors,
}: StepPersonalInfoProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-foreground mb-1.5">
            Nome
          </label>
          <input
            id="first_name"
            type="text"
            placeholder="Nome"
            value={data.first_name}
            onChange={(e) => onChange({ ...data, first_name: e.target.value })}
            className={inputClass}
            autoComplete="given-name"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
          )}
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-foreground mb-1.5">
            Sobrenome
          </label>
          <input
            id="last_name"
            type="text"
            placeholder="Sobrenome"
            value={data.last_name}
            onChange={(e) => onChange({ ...data, last_name: e.target.value })}
            className={inputClass}
            autoComplete="family-name"
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="birth_date" className="block text-sm font-medium text-foreground mb-1.5">
          Data de nascimento
        </label>
        <input
          id="birth_date"
          type="date"
          max={maxBirthDateForMinAge18()}
          value={data.birth_date}
          onChange={(e) => onChange({ ...data, birth_date: e.target.value })}
          className={inputClass}
          autoComplete="bday"
        />
        {errors.birth_date && (
          <p className="mt-1 text-sm text-red-600">{errors.birth_date}</p>
        )}
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium text-foreground mb-1.5">
          Cidade
        </label>
        <input
          id="city"
          type="text"
          placeholder="Cidade"
          value={data.city}
          onChange={(e) => onChange({ ...data, city: e.target.value })}
          className={inputClass}
          autoComplete="address-level2"
        />
        {errors.city && (
          <p className="mt-1 text-sm text-red-600">{errors.city}</p>
        )}
      </div>

      <div>
        <span className="block text-sm font-medium text-foreground mb-2">
          Gênero
        </span>
        <select
          value={data.gender}
          onChange={(e) => onChange({ ...data, gender: e.target.value as Gender })}
          className={inputClass}
          aria-label="Gênero"
        >
          {GENDERS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.gender && (
          <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
        )}
      </div>
    </div>
  );
}
