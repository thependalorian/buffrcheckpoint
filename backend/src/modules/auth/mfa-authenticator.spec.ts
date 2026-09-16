import { authenticator } from "otplib";

import { normalizeTotpCode } from "../../common/crypto/secret-crypto";

describe("MFA authenticator helpers", () => {
  beforeAll(() => {
    authenticator.options = { window: 1 };
  });

  it("builds a Google Authenticator-compatible otpauth URI", () => {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri("owner@example.com", "Buffr Checkpoint", secret);

    expect(otpauthUrl.startsWith("otpauth://totp/")).toBe(true);
    expect(otpauthUrl).toContain("secret=");
    expect(otpauthUrl).toContain("issuer=Buffr%20Checkpoint");
    expect(otpauthUrl).toContain("period=30");
    expect(otpauthUrl).toContain("digits=6");
    expect(otpauthUrl).toContain("algorithm=SHA1");
  });

  it("verifies TOTP codes generated from the shared secret", () => {
    const secret = authenticator.generateSecret();
    const code = authenticator.generate(secret);
    expect(authenticator.check(code, secret)).toBe(true);
  });

  it("normalizes spaced authenticator pastes before verify", () => {
    expect(normalizeTotpCode("123 456")).toBe("123456");
    expect(normalizeTotpCode("12-34-56")).toBe("123456");
    expect(normalizeTotpCode(" 998877 ")).toBe("998877");
  });
});
