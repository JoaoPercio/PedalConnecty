import { reportUsabilityEvent } from "@/usability-tests";
import { supabase } from "./supabase";
import { uploadAvatar } from "./profile";
import type { ProfileInsert, RegistrationFormData } from "@/types/registration";

export async function registerWithProfile(
  data: RegistrationFormData
): Promise<{ error: Error | null }> {
  const { email, password, avatar_file } = data.step3;
  const { skill_level } = data.step2;
  const { first_name, last_name, birth_date, gender } = data.step1;

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return { error: signUpError };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { error: new Error("Falha ao criar usuário.") };
  }

  let avatarUrl: string | null = null;

  if (avatar_file) {
    const { avatarUrl: uploaded, error: uploadError } = await uploadAvatar(
      userId,
      avatar_file
    );
    if (!uploadError) avatarUrl = uploaded;
  }

  const profile: ProfileInsert = {
    id: userId,
    first_name,
    last_name,
    birth_date,
    city: null,
    gender,
    skill_level,
    avatar_url: avatarUrl,
    registration_completed_at: new Date().toISOString(),
  };

  const { error: profileError } = await supabase.from("profiles").insert(profile);

  if (profileError) {
    return { error: profileError };
  }

  reportUsabilityEvent({ type: "account_registered" });
  if (authData.session) {
    reportUsabilityEvent({ type: "signed_in" });
  }

  return { error: null };
}
