import type { ProfileRow } from "@/lib/profile";

/** Perfil considerado completo para aceder à app (cadastro email ou OAuth finalizado). */
export function isProfileRegistrationComplete(
  profile: ProfileRow | null
): boolean {
  return profile?.registration_completed_at != null;
}
