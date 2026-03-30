export type Gender = "masculino" | "feminino" | "outro";

export type SkillLevel = "iniciante" | "intermediario" | "experiente" | "profissional";

export interface StepPersonalInfo {
  first_name: string;
  last_name: string;
  birth_date: string;
  city: string;
  gender: Gender;
}

export interface StepSkillLevel {
  skill_level: SkillLevel;
}

export interface StepAccount {
  email: string;
  password: string;
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
  city: string;
  gender: Gender;
  skill_level: SkillLevel;
  avatar_url: string | null;
}
