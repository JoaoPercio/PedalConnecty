import { supabase } from "@/lib/supabase";
import { getProfile, uploadAvatar } from "@/lib/profile";
import type { SkillLevel, StepPersonalInfo } from "@/types/registration";

export async function completeOAuthRegistration(
  userId: string,
  step1: StepPersonalInfo,
  skill_level: SkillLevel,
  avatarFile: File | null,
  existingAvatarUrl: string | null
): Promise<{ error: Error | null }> {
  let avatarUrl = existingAvatarUrl;

  if (avatarFile) {
    const { avatarUrl: uploaded, error: upErr } = await uploadAvatar(
      userId,
      avatarFile
    );
    if (upErr) return { error: upErr };
    avatarUrl = uploaded;
  }

  const now = new Date().toISOString();
  const row = {
    first_name: step1.first_name.trim(),
    last_name: step1.last_name.trim(),
    birth_date: step1.birth_date,
    city: step1.city.trim(),
    gender: step1.gender,
    skill_level,
    avatar_url: avatarUrl,
    registration_completed_at: now,
  };

  const existing = await getProfile(userId);

  if (existing) {
    const { error } = await supabase.from("profiles").update(row).eq("id", userId);
    return { error: error ?? null };
  }

  const { error } = await supabase.from("profiles").insert({
    id: userId,
    ...row,
    completed_pedals_count: 0,
  });

  return { error: error ?? null };
}
