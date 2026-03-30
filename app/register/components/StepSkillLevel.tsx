"use client";

import type { StepSkillLevel as Data, SkillLevel } from "@/types/registration";

const LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "experiente", label: "Experiente" },
  { value: "profissional", label: "Profissional" },
];

interface StepSkillLevelProps {
  data: Data;
  onChange: (data: Data) => void;
  error?: string;
}

export function StepSkillLevel({ data, onChange, error }: StepSkillLevelProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Selecione seu nível de experiência no ciclismo.
      </p>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Nível de habilidade">
        {LEVELS.map(({ value, label }) => (
          <label
            key={value}
            className={`
              flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors
              ${data.skill_level === value
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-gray-200 hover:border-gray-300 bg-surface"}
            `}
          >
            <input
              type="radio"
              name="skill_level"
              value={value}
              checked={data.skill_level === value}
              onChange={() => onChange({ ...data, skill_level: value })}
              className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
            />
            <span className="font-medium text-foreground">{label}</span>
          </label>
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
