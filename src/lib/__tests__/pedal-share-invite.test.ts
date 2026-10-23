import { afterEach, describe, expect, it, vi } from "vitest";
import { sanitizeAuthNext } from "../auth-next";
import { getSiteOrigin } from "../site-origin";
import {
  buildInviteShareMessage,
  buildPedalInviteUrl,
  buildWhatsAppShareUrl,
  isShareInviteToken,
} from "../pedal-share-link";

const TOKEN = "a".repeat(64);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("pedal share invite links", () => {
  it("builds a local invite url from the live origin", () => {
    expect(buildPedalInviteUrl("http://localhost:3030/", TOKEN)).toBe(
      `http://localhost:3030/convite/${TOKEN}`
    );
  });

  it("builds a production invite url without localhost", () => {
    const url = buildPedalInviteUrl("https://pedal-connect.vercel.app", TOKEN);
    expect(url).toBe(`https://pedal-connect.vercel.app/convite/${TOKEN}`);
    expect(url).not.toContain("localhost");
  });

  it("keeps a relative path when the origin is unknown", () => {
    expect(buildPedalInviteUrl("", TOKEN)).toBe(`/convite/${TOKEN}`);
  });

  it("reuses NEXT_PUBLIC_SITE_URL on the server and the Vercel host for previews", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pedal-connect.vercel.app/");
    vi.stubEnv("VERCEL_URL", "preview.example.vercel.app");
    expect(getSiteOrigin()).toBe("https://pedal-connect.vercel.app");

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "pedal-connect-git-preview.vercel.app");
    expect(getSiteOrigin()).toBe("https://pedal-connect-git-preview.vercel.app");
  });
});

describe("whatsapp share message", () => {
  it("encodes accents, spaces and emoji in the official wa.me url", () => {
    const link = `https://pedal-connect.vercel.app/convite/${TOKEN}`;
    const message = buildInviteShareMessage({
      link,
      allowsDirectJoin: false,
    });
    expect(message).toContain("solicitar participação");
    expect(message).toContain(link);
    expect(message).toContain("🚴");

    const direct = buildInviteShareMessage({ link, allowsDirectJoin: true });
    expect(direct).toContain("entrar diretamente");

    const shareUrl = buildWhatsAppShareUrl(message);
    expect(shareUrl.startsWith("https://wa.me/?text=")).toBe(true);
    const decoded = decodeURIComponent(shareUrl.slice("https://wa.me/?text=".length));
    expect(decoded).toBe(message);
    expect(decoded).toContain("Você foi convidado");
  });
});

describe("auth return path", () => {
  it("accepts only the invite path", () => {
    expect(sanitizeAuthNext(`/convite/${TOKEN}`)).toBe(`/convite/${TOKEN}`);
    expect(sanitizeAuthNext(encodeURIComponent(`/convite/${TOKEN}`))).toBe(
      `/convite/${TOKEN}`
    );
  });

  it("rejects open redirects and other app paths", () => {
    expect(sanitizeAuthNext("https://evil.example/convite/" + TOKEN)).toBeNull();
    expect(sanitizeAuthNext("//evil.example")).toBeNull();
    expect(sanitizeAuthNext("/home")).toBeNull();
    expect(sanitizeAuthNext(`/convite/${TOKEN}/extra`)).toBeNull();
    expect(sanitizeAuthNext("/convite/short")).toBeNull();
    expect(sanitizeAuthNext(`/pedals/entrar`)).toBeNull();
  });

  it("checks the invite token shape", () => {
    expect(isShareInviteToken(TOKEN)).toBe(true);
    expect(isShareInviteToken(TOKEN.toUpperCase())).toBe(true);
    expect(isShareInviteToken("not-a-token")).toBe(false);
  });
});
