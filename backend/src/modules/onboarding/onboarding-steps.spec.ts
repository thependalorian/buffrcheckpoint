import {
  autoSteps,
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

/** Everything that must be done before go-live: the owner's required steps and the ones the system completes. */
const requiredFor = (route: LaunchRoute) =>
  ONBOARDING_STEPS.filter(
    (step) =>
      step !== "golive_approval" &&
      (STEP_REQUIREMENTS[step][route] === "required" || STEP_REQUIREMENTS[step][route] === "auto"),
  );

/** What the owner actually has to do. */
const ownerStepsFor = (route: LaunchRoute) =>
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

  it("asks the owner for three things on the default route: standards, a first test arrival, and go-live", () => {
    expect([...ownerStepsFor("qr_first"), "golive_approval"]).toEqual([
      "notices_retention",
      "flow_tests",
      "golive_approval",
    ]);
  });

  it("asks a kiosk owner for two more: a kiosk configuration and a device", () => {
    expect(ownerStepsFor("kiosk")).toEqual(["notices_retention", "check_in_channels", "devices_mdm", "flow_tests"]);
  });

  it("completes setup for the owner from defaults: profile, site, host, route, form, QR and the launch acknowledgement", () => {
    expect(autoSteps("qr_first")).toEqual([
      "organisation_profile",
      "site_hierarchy",
      "hosts_departments",
      "launch_route",
      "visitor_categories",
      "check_in_channels",
      "role_training",
    ]);
    // The kiosk route keeps the channels step as the owner's, because a kiosk configuration is theirs to make.
    expect(autoSteps("kiosk")).not.toContain("check_in_channels");
    expect(autoSteps(null)).toEqual(autoSteps("qr_first"));
  });

  it("never lets the owner skip an automatic step", () => {
    for (const step of autoSteps("qr_first")) expect(canSkipStep(step, "qr_first")).toBe(false);
  });

  it("matches the documented requirement matrix", () => {
    expect(ONBOARDING_STEPS).not.toContain("branding"); // custom branding was retired
    expect(stepRequirement("devices_mdm", "qr_first")).toBe("not_applicable");
    expect(stepRequirement("devices_mdm", "kiosk")).toBe("required");
    expect(stepRequirement("cran_evidence", "kiosk")).toBe("conditional");
    expect(stepRequirement("risk_identity_approval", "qr_first")).toBe("recommended");
    expect(stepRequirement("flow_tests", null)).toBe("required");
    expect(stepRequirement("notices_retention", "qr_first")).toBe("required");
    expect(stepRequirement("organisation_profile", "qr_first")).toBe("auto");
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

  it("points at the first step the owner has to do, then at go-live, and never rewinds", () => {
    // A brand-new organisation: the system's steps are not the owner's, so the pointer is the standards review.
    expect(currentStep({ route: null, completed: [], skipped: [] })).toBe("notices_retention");
    // Standards accepted: the next thing is the first test arrival.
    expect(currentStep({ route: "qr_first", completed: ["notices_retention"], skipped: [] })).toBe("flow_tests");
    // Completing an optional step does not move the pointer.
    const completed: OnboardingStepCode[] = ["notices_retention", "risk_identity_approval"];
    expect(currentStep({ route: "qr_first", completed, skipped: [] })).toBe("flow_tests");
    expect(currentStep({ route: "qr_first", completed: requiredFor("qr_first"), skipped: [] })).toBe("golive_approval");
  });

  it("falls back to an automatic step only when nothing is left for the owner", () => {
    const completed = ["notices_retention", "flow_tests"] as OnboardingStepCode[];
    // The owner's steps are done, but the system's site step is not (say the only site was deleted): it is surfaced.
    expect(currentStep({ route: "qr_first", completed, skipped: [] })).toBe("organisation_profile");
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
