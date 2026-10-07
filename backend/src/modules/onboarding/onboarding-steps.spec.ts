import {
  canSkipStep,
  currentStep,
  describeSteps,
  LAUNCH_ROUTES,
  type LaunchRoute,
  missingBeforeGolive,
  ONBOARDING_STEPS,
  type OnboardingStepCode,
  STEP_REQUIREMENTS,
  stepRequirement,
} from "./onboarding-steps";

const requiredFor = (route: LaunchRoute) =>
  ONBOARDING_STEPS.filter((step) => step !== "golive_approval" && STEP_REQUIREMENTS[step][route] === "required");

describe("launch-readiness checklist", () => {
  it("orders profile, first site and hosts before the launch route choice", () => {
    expect(ONBOARDING_STEPS.slice(0, 4)).toEqual([
      "organisation_profile",
      "site_hierarchy",
      "hosts_departments",
      "launch_route",
    ]);
    expect(ONBOARDING_STEPS.at(-1)).toBe("golive_approval");
  });

  it("matches the documented requirement matrix", () => {
    expect(ONBOARDING_STEPS).not.toContain("branding"); // custom branding was retired
    expect(stepRequirement("devices_mdm", "qr_first")).toBe("not_applicable");
    expect(stepRequirement("devices_mdm", "kiosk")).toBe("required");
    expect(stepRequirement("cran_evidence", "kiosk")).toBe("conditional");
    expect(stepRequirement("risk_identity_approval", "qr_first")).toBe("recommended");
    expect(stepRequirement("flow_tests", null)).toBe("required");
  });

  it.each(LAUNCH_ROUTES)("blocks go-live exactly when a required %s step is incomplete", (route) => {
    const required = requiredFor(route);
    expect(missingBeforeGolive({ route, completed: required, skipped: [] })).toEqual([]);
    for (const step of required) {
      const completed = required.filter((s) => s !== step);
      expect(missingBeforeGolive({ route, completed, skipped: [] })).toEqual([step]);
    }
    // Optional steps never block, done or not.
    const optional = ONBOARDING_STEPS.filter((s) => !required.includes(s) && s !== "golive_approval");
    expect(missingBeforeGolive({ route, completed: required, skipped: optional })).toEqual([]);
  });

  it("treats skipped steps as incomplete for required ones", () => {
    const required = requiredFor("qr_first");
    expect(missingBeforeGolive({ route: "qr_first", completed: required.slice(1), skipped: [required[0]] })).toEqual([
      required[0],
    ]);
  });

  it("points at the first required incomplete step and never rewinds", () => {
    expect(currentStep({ route: null, completed: [], skipped: [] })).toBe("organisation_profile");
    expect(
      currentStep({
        route: null,
        completed: ["organisation_profile", "site_hierarchy", "hosts_departments"],
        skipped: [],
      }),
    ).toBe("launch_route");
    // Completing a later optional step does not move the pointer back or forward.
    const completed: OnboardingStepCode[] = ["organisation_profile", "risk_identity_approval"];
    expect(currentStep({ route: "qr_first", completed, skipped: [] })).toBe("site_hierarchy");
    expect(currentStep({ route: "qr_first", completed: requiredFor("qr_first"), skipped: [] })).toBe("golive_approval");
  });

  it("allows skipping only recommended and conditional steps", () => {
    expect(canSkipStep("risk_identity_approval", "qr_first")).toBe(true);
    expect(canSkipStep("risk_identity_approval", "kiosk")).toBe(true);
    expect(canSkipStep("cran_evidence", "kiosk")).toBe(true);
    expect(canSkipStep("devices_mdm", "qr_first")).toBe(false);
    expect(canSkipStep("flow_tests", "qr_first")).toBe(false);
  });

  it("describes each step's state", () => {
    const steps = describeSteps({ route: "kiosk", completed: ["organisation_profile"], skipped: ["cran_evidence"] });
    expect(steps.find((s) => s.code === "organisation_profile")?.state).toBe("done");
    expect(steps.find((s) => s.code === "cran_evidence")?.state).toBe("skipped");
    expect(steps.find((s) => s.code === "devices_mdm")).toEqual({
      code: "devices_mdm",
      requirement: "required",
      state: "todo",
    });
  });
});
