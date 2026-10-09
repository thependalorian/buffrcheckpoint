import { type CredentialState, isTokenRevoked } from "./credential-revocation";

const changedAt = new Date("2026-10-08T12:00:30.500Z");
const state = (over: Partial<CredentialState> = {}): CredentialState => ({
  active: true,
  credentialsChangedAt: null,
  ...over,
});
const iat = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe("isTokenRevoked", () => {
  it("accepts any token when nothing has changed", () => {
    expect(isTokenRevoked(iat("2026-10-01T00:00:00Z"), state())).toBe(false);
    expect(isTokenRevoked(undefined, state())).toBe(false);
  });

  it("refuses a token issued before the credential change", () => {
    expect(isTokenRevoked(iat("2026-10-08T12:00:29Z"), state({ credentialsChangedAt: changedAt }))).toBe(true);
  });

  it("accepts a token issued after the change and one issued in the same second", () => {
    expect(isTokenRevoked(iat("2026-10-08T12:00:30Z"), state({ credentialsChangedAt: changedAt }))).toBe(false);
    expect(isTokenRevoked(iat("2026-10-08T12:05:00Z"), state({ credentialsChangedAt: changedAt }))).toBe(false);
  });

  it("refuses a token with no issue time once a change exists", () => {
    expect(isTokenRevoked(undefined, state({ credentialsChangedAt: changedAt }))).toBe(true);
  });

  it("refuses every token for a deleted or missing user (SE-6)", () => {
    expect(isTokenRevoked(iat("2026-10-08T13:00:00Z"), state({ active: false }))).toBe(true);
    expect(isTokenRevoked(iat("2026-10-08T13:00:00Z"), null)).toBe(true);
  });
});
