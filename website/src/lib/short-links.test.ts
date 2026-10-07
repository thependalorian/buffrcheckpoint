import { describe, expect, it } from "vitest";

import { shortLinkTarget } from "./short-links";

const TOKEN = "oPz9y2S8T0aOeyfLYb4mSq1Zm3ZmZXJBcDEFGHI".padEnd(41, "J");

describe("shortLinkTarget", () => {
  it("sends a well-formed sign-out token to the check-out page", () => {
    expect(TOKEN).toHaveLength(41);
    expect(shortLinkTarget("signOut", TOKEN)).toBe(`/check-out?v=${TOKEN}`);
  });

  it("sends a well-formed rating token to the rate page", () => {
    expect(shortLinkTarget("rate", TOKEN)).toBe(`/rate?t=${TOKEN}`);
  });

  it("falls back to the plain page for anything else, never echoing it", () => {
    for (const bad of ["", "short", `${TOKEN}x`, "<script>alert(1)</script>".padEnd(41, "a")]) {
      expect(shortLinkTarget("signOut", bad)).toBe("/check-out");
      expect(shortLinkTarget("rate", bad)).toBe("/rate");
    }
  });
});
