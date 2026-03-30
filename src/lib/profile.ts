import { supabase } from "./supabase";

const PROFILE_CACHE_KEY = "pedalconnect_profile_cache";

export interface CachedProfile {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  /** Pedais concluídos (criador ou participante aprovado); mantido em `profiles.completed_pedals_count`. */
  completedPedalsCount: number;
}

export interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  city: string | null;
  gender: string | null;
  skill_level: string | null;
  completed_pedals_count: number;
}

export function getCachedProfile(): CachedProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedProfile>;
    if (!parsed.userId) return null;
    return {
      userId: parsed.userId,
      email: parsed.email ?? "",
      fullName: parsed.fullName ?? "Usuário",
      avatarUrl: parsed.avatarUrl ?? null,
      completedPedalsCount: parsed.completedPedalsCount ?? 0,
    };
  } catch {
    return null;
  }
}

export function setCachedProfile(data: CachedProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function clearCachedProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // ignore
  }
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, avatar_url, city, gender, skill_level, completed_pedals_count"
    )
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  const row = data as ProfileRow;
  return {
    ...row,
    completed_pedals_count: row.completed_pedals_count ?? 0,
  };
}

export interface ProfileUpdate {
  avatar_url?: string | null;
  city?: string | null;
  gender?: string | null;
  skill_level?: string | null;
}

export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  return { error: error ?? null };
}

const AVATARS_BUCKET = "avatars";

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ avatarUrl: string | null; error: Error | null }> {
  const filePath = `${userId}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) return { avatarUrl: null, error: uploadError };

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath);
  return { avatarUrl: data.publicUrl, error: null };
}
