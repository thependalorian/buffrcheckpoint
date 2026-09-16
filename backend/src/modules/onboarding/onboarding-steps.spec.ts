import { ONBOARDING_STEPS, REQUIRED_BEFORE_GOLIVE } from "../onboarding/onboarding-steps";

describe("onboarding steps", () => {
  it("defines exactly 13 wizard steps", () => {
    expect(ONBOARDING_STEPS).toHaveLength(13);
  });

  it("requires MFA-gated prerequisites before go-live without trusting a client flag", () => {
    expect(REQUIRED_BEFORE_GOLIVE).not.toContain("golive_approval");
    expect(REQUIRED_BEFORE_GOLIVE).toContain("organisation_profile");
    expect(REQUIRED_BEFORE_GOLIVE).toContain("role_training");
  });
});
