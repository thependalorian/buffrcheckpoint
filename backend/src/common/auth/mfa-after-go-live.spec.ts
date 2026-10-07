import { mfaSetupRequired } from "./mfa-after-go-live";

const base = {
  audience: "admin" as const,
  mfaEnabled: false,
  hasSupportSession: false,
  path: "/visits",
  organisationLive: true,
};

describe("mfaSetupRequired", () => {
  it("does not apply while the organisation is still onboarding", () => {
    expect(mfaSetupRequired({ ...base, organisationLive: false })).toBe(false);
  });

  it("blocks an MFA-less customer user on every business endpoint once the organisation is live", () => {
    for (const path of ["/visits", "/sites", "/organisations/me", "/compliance/dashboard", "/visitors/x"]) {
      expect(mfaSetupRequired({ ...base, path })).toBe(true);
    }
  });

  it("leaves the account and setup endpoints reachable so the user can fix it", () => {
    for (const path of [
      "/auth/me",
      "/auth/session-gate",
      "/auth/mfa/enroll/start",
      "/auth/mfa/enroll/confirm",
      "/health",
    ]) {
      expect(mfaSetupRequired({ ...base, path })).toBe(false);
    }
  });

  it("does not apply to users who have MFA, staff sessions or support sessions", () => {
    expect(mfaSetupRequired({ ...base, mfaEnabled: true })).toBe(false);
    expect(mfaSetupRequired({ ...base, audience: "ops" })).toBe(false);
    expect(mfaSetupRequired({ ...base, audience: "ops_enroll" })).toBe(false);
    expect(mfaSetupRequired({ ...base, hasSupportSession: true })).toBe(false);
  });
});
