"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23616161'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
};

function withCacheBust(url: string, v: string) {
  if (url.startsWith("data:")) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("v", v);
    return u.toString();
  } catch {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}v=${encodeURIComponent(v)}`;
  }
}

export function AvatarImg({
  src,
  alt = "",
  className,
  fallbackSrc = DEFAULT_AVATAR,
}: Props) {
  const base = useMemo(() => src ?? fallbackSrc, [src, fallbackSrc]);
  const [attempt, setAttempt] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    setAttempt(0);
  }, [base]);

  const resolvedSrc = useMemo(() => {
    if (attempt === 0) return base;
    if (attempt === 1) return withCacheBust(base, String(Date.now()));
    return fallbackSrc;
  }, [attempt, base, fallbackSrc]);

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setAttempt((a) => (a < 2 ? ((a + 1) as 1 | 2) : a))}
    />
  );
}

