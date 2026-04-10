"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth";
import { toast } from "sonner";

export function GoogleSignInButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      toast.error(error.message);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-medium text-foreground bg-surface border border-gray-200 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-70 transition-colors shadow-sm"
    >
      <GoogleGlyph />
      {loading ? "Abrindo Google…" : "Continuar com Google"}
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.42 35.662 29.223 40 24 40c-8.837 0-16-7.163-16-16S15.163 8 24 8c4.065 0 7.755 1.49 10.611 3.922l5.657-5.657C34.568 3.184 29.564 0 24 0 10.745 0 0 10.745 0 24s10.745 24 24 24 24-10.745 24-24c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
