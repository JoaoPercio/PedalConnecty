import { reportUsabilityEvent } from "@/usability-tests";
import { supabase } from "./supabase";
import { getAuthRedirectOrigin } from "./site-origin";

export async function signInWithGoogle() {
  const origin = getAuthRedirectOrigin();
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}

export async function signUp(email: string, password: string) {
  return await supabase.auth.signUp({
    email,
    password,
  });
}

export async function signIn(email: string, password: string) {
  const result = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!result.error && result.data.user) {
    reportUsabilityEvent({ type: "signed_in" });
  }
  return result;
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAuthRedirectOrigin()}/login`,
  });
}