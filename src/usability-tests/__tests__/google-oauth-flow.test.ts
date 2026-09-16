import { describe, expect, it } from "vitest";
import { userHasGoogleIdentity } from "../google-oauth-flow";

describe("userHasGoogleIdentity", () => {
  it("detects google from app_metadata.provider", () => {
    expect(userHasGoogleIdentity({ app_metadata: { provider: "google" } })).toBe(
      true
    );
  });

  it("detects google from identities", () => {
    expect(
      userHasGoogleIdentity({
        identities: [{ provider: "email" }, { provider: "google" }],
      })
    ).toBe(true);
  });

  it("returns false without google", () => {
    expect(
      userHasGoogleIdentity({
        app_metadata: { provider: "email" },
        identities: [{ provider: "email" }],
      })
    ).toBe(false);
  });
});
