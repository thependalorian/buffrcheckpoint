import {
  assertTransition,
  earlyStagePath,
  IllegalOnboardingTransitionError,
  isTransitionAllowed,
  ONBOARDING_STATUSES,
  type OnboardingStatus,
} from "./onboarding-transitions";

const LEGAL_FORWARD: Array<[OnboardingStatus, OnboardingStatus]> = [
  ["pending_email_verification", "email_verified"],
  ["email_verified", "mfa_enrolled"],
  ["mfa_enrolled", "in_progress"],
  ["in_progress", "ready_for_golive"],
  ["in_progress", "live"],
  ["ready_for_golive", "live"],
];

describe("onboarding transitions", () => {
  it("allows exactly the documented forward edges", () => {
    for (const from of ONBOARDING_STATUSES) {
      for (const to of ONBOARDING_STATUSES) {
        const expected = LEGAL_FORWARD.some(([f, t]) => f === from && t === to);
        expect([from, to, isTransitionAllowed(from, to, "forward")]).toEqual([from, to, expected]);
      }
    }
  });

  it("rejects every backward move outside an override", () => {
    expect(() => assertTransition("live", "in_progress")).toThrow(IllegalOnboardingTransitionError);
    expect(() => assertTransition("live", "mfa_enrolled")).toThrow(IllegalOnboardingTransitionError);
    expect(() => assertTransition("ready_for_golive", "in_progress")).toThrow(IllegalOnboardingTransitionError);
    expect(() => assertTransition("in_progress", "email_verified")).toThrow(IllegalOnboardingTransitionError);
  });

  it("only reaches or leaves suspended through an override", () => {
    for (const from of ONBOARDING_STATUSES) {
      if (from === "suspended") continue;
      expect(isTransitionAllowed(from, "suspended", "forward")).toBe(false);
      expect(isTransitionAllowed(from, "suspended", "override")).toBe(true);
    }
    expect(isTransitionAllowed("suspended", "live", "forward")).toBe(false);
    expect(isTransitionAllowed("suspended", "live", "override")).toBe(true);
  });

  it("never lets an override return to pending_email_verification or self-transition", () => {
    expect(isTransitionAllowed("live", "pending_email_verification", "override")).toBe(false);
    expect(isTransitionAllowed("live", "live", "override")).toBe(false);
  });

  it("advances early stages without ever regressing a further organisation", () => {
    expect(earlyStagePath("pending_email_verification", "in_progress")).toEqual([
      "email_verified",
      "mfa_enrolled",
      "in_progress",
    ]);
    expect(earlyStagePath("email_verified", "email_verified")).toEqual([]);
    expect(earlyStagePath("live", "email_verified")).toEqual([]);
    expect(earlyStagePath("live", "in_progress")).toEqual([]);
    expect(earlyStagePath("ready_for_golive", "mfa_enrolled")).toEqual([]);
    expect(earlyStagePath("suspended", "in_progress")).toEqual([]);
  });

  it("refuses to use user activation to reach go-live states", () => {
    expect(() => earlyStagePath("in_progress", "live")).toThrow(IllegalOnboardingTransitionError);
    expect(() => earlyStagePath("in_progress", "ready_for_golive")).toThrow(IllegalOnboardingTransitionError);
  });
});
