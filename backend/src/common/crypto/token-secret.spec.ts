import { createCompactToken, verifyCompactToken } from "./compact-link-token";
import { purposeTokenKey } from "./token-secret";

const VISIT = "0b7e5f3a-9c41-4d2e-8a16-5f3b2c1d4e60";

describe("purposeTokenKey (SC-2)", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("never falls back to the access-token signing secret", () => {
    process.env.NODE_ENV = "test";
    delete process.env.QR_TOKEN_PEPPER;
    process.env.JWT_SECRET = "jwt-secret-that-must-not-leak-into-link-tokens";
    expect(purposeTokenKey("compact-link")).not.toContain("jwt-secret-that-must-not-leak");
  });

  it("refuses to run in production without its own pepper, even when JWT_SECRET is set", () => {
    process.env.NODE_ENV = "production";
    delete process.env.QR_TOKEN_PEPPER;
    process.env.JWT_SECRET = "x".repeat(64);
    expect(() => purposeTokenKey("compact-link")).toThrow(/QR_TOKEN_PEPPER/);
  });

  it("does not verify a link token minted under a different pepper", () => {
    process.env.NODE_ENV = "test";
    process.env.QR_TOKEN_PEPPER = "p".repeat(40);
    const token = createCompactToken("o", VISIT, Date.now() + 60_000);
    expect(verifyCompactToken(token)?.visitId).toBe(VISIT);
    process.env.QR_TOKEN_PEPPER = "q".repeat(40);
    expect(verifyCompactToken(token)).toBeNull();
  });

  it("separates purposes", () => {
    process.env.NODE_ENV = "test";
    process.env.QR_TOKEN_PEPPER = "p".repeat(40);
    expect(purposeTokenKey("visit-sign-out")).not.toBe(purposeTokenKey("visit-survey"));
  });
});
