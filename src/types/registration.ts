export type Gender = "masculino" | "feminino" | "outro";

export type SkillLevel = "iniciante" | "intermediario" | "experiente" | "profissional";

export interface StepPersonalInfo {
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: Gender;
}

export interface StepSkillLevel {
  skill_level: SkillLevel;
}

export interface StepAccount {
  email: string;
  password: string;
  password_confirm: string;
  avatar_file: File | null;
}

export interface RegistrationFormData {
  step1: StepPersonalInfo;
  step2: StepSkillLevel;
  step3: StepAccount;
}

export interface ProfileInsert {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  city: string | null;
  gender: Gender;
  skill_level: SkillLevel;
  avatar_url: string | null;
  /** Definido no registo por email e após completar cadastro OAuth. */
  registration_completed_at?: string;
}
