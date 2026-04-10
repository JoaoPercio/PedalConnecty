import type { StepPersonalInfo as Step1Data } from "@/types/registration";

export const MIN_REGISTRATION_AGE = 18;

/** `birthDateIso` no formato YYYY-MM-DD (input type="date"). */
export function isAtLeastAge(birthDateIso: string, minAge: number): boolean {
  const parts = birthDateIso.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
  const [y, m, d] = parts;
  const birth = new Date(y, m - 1, d);
  if (
    birth.getFullYear() !== y ||
    birth.getMonth() !== m - 1 ||
    birth.getDate() !== d
  ) {
    return false;
  }
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= minAge;
}

export function validateStep1PersonalInfo(
  data: Step1Data
): Partial<Record<keyof Step1Data, string>> {
  const errors: Partial<Record<keyof Step1Data, string>> = {};
  if (!data.first_name?.trim()) errors.first_name = "Nome é obrigatório.";
  if (!data.last_name?.trim()) errors.last_name = "Sobrenome é obrigatório.";
  if (!data.birth_date) {
    errors.birth_date = "Data de nascimento é obrigatória.";
  } else if (!isAtLeastAge(data.birth_date, MIN_REGISTRATION_AGE)) {
    errors.birth_date =
      "É necessário ter pelo menos 18 anos para se cadastrar.";
  }
  if (!data.city?.trim()) errors.city = "Cidade é obrigatória.";
  return errors;
}
