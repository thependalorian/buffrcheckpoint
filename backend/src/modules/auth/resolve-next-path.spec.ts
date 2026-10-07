import { AuthService } from "./auth.service";

const next = (...args: Parameters<AuthService["resolveNextPath"]>) =>
  AuthService.prototype.resolveNextPath.call({}, ...args);

describe("resolveNextPath: MFA comes after onboarding", () => {
  it("sends an unverified user to check their email first", () => {
    expect(next(false, false, null, null)).toBe("/auth/check-email");
  });

  it("does not ask for MFA while onboarding", () => {
    expect(next(true, false, "in_progress", "site_hierarchy")).toBe("/onboarding/site-hierarchy");
    expect(next(true, false, null, null)).toBe("/onboarding/organisation-profile");
    expect(next(true, false, "in_progress", "x", false)).toBe("/onboarding/waiting");
  });

  it("requires MFA setup once the organisation is live", () => {
    expect(next(true, false, "live", null)).toBe("/auth/mfa/setup");
    expect(next(true, true, "live", null)).toBe("/dashboard/overview");
  });
});
