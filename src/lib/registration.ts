import { supabase } from "./supabase";
import type { ProfileInsert, RegistrationFormData } from "@/types/registration";

const AVATARS_BUCKET = "avatars";

export async function registerWithProfile(
  data: RegistrationFormData
): Promise<{ error: Error | null }> {
  const { email, password, avatar_file } = data.step3;
  const { skill_level } = data.step2;
  const { first_name, last_name, birth_date, city, gender } = data.step1;

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
    const filePath = `${userId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(filePath, avatar_file, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from(AVATARS_BUCKET)
        .getPublicUrl(filePath);
      avatarUrl = publicUrlData.publicUrl;
    }
  }

  const profile: ProfileInsert = {
    id: userId,
    first_name,
    last_name,
    birth_date,
    city,
    gender,
    skill_level,
    avatar_url: avatarUrl,
  };

  const { error: profileError } = await supabase.from("profiles").insert(profile);

  if (profileError) {
    return { error: profileError };
  }

  return { error: null };
}
