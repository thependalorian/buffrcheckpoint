// Launch-readiness checklist (buffrcheckpoint.md v0.33). Step codes are
// type_definition rows in domain `onboarding_step_code`; this file is the
// single authority for their order and which ones each launch route needs.

export const ONBOARDING_STEPS = [
  "organisation_profile",
  "site_hierarchy",
  "hosts_departments",
  "launch_route",
  "notices_retention",
  "visitor_categories",
  "check_in_channels",
  "branding",
  "risk_identity_approval",
  "devices_mdm",
  "flow_tests",
  "role_training",
  "cran_evidence",
  "golive_approval",
] as const;

export type OnboardingStepCode = (typeof ONBOARDING_STEPS)[number];

export const LAUNCH_ROUTES = ["qr_first", "kiosk"] as const;
export type LaunchRoute = (typeof LAUNCH_ROUTES)[number];

export type StepRequirement = "required" | "recommended" | "conditional" | "not_applicable";

const BOTH_REQUIRED = { qr_first: "required", kiosk: "required" } as const;

export const STEP_REQUIREMENTS: Readonly<Record<OnboardingStepCode, Readonly<Record<LaunchRoute, StepRequirement>>>> = {
  organisation_profile: BOTH_REQUIRED,
  site_hierarchy: BOTH_REQUIRED,
  hosts_departments: BOTH_REQUIRED,
  launch_route: BOTH_REQUIRED,
  notices_retention: BOTH_REQUIRED,
  visitor_categories: BOTH_REQUIRED,
  // Evidence differs by route: QR-first needs an active site QR; kiosk also needs a kiosk configuration.
  check_in_channels: BOTH_REQUIRED,
  branding: { qr_first: "recommended", kiosk: "required" },
  risk_identity_approval: { qr_first: "recommended", kiosk: "recommended" },
  devices_mdm: { qr_first: "not_applicable", kiosk: "required" },
  flow_tests: BOTH_REQUIRED,
  role_training: BOTH_REQUIRED,
  // Only when regulated hardware is deployed; "Add later" in the checklist.
  cran_evidence: { qr_first: "conditional", kiosk: "conditional" },
  golive_approval: BOTH_REQUIRED,
};

/**
 * Steps that cannot start until earlier objects exist (buffrcheckpoint.md
 * §11.9.15.2-3). Values are evidence keys from onboarding-evidence.service.ts,
 * so the admin blocker copy names the prerequisite and its fix.
 */
export const STEP_PREREQUISITES: Readonly<Partial<Record<OnboardingStepCode, readonly string[]>>> = {
  hosts_departments: ["sites.at_least_one"],
  launch_route: ["sites.at_least_one"],
  check_in_channels: ["sites.at_least_one"],
  branding: ["sites.at_least_one"],
  devices_mdm: ["sites.at_least_one"],
  flow_tests: ["sites.at_least_one", "hosts.at_least_one"],
};

/** Until a route is chosen the checklist is shown with QR-first (Core) requirements. */
export const DEFAULT_LAUNCH_ROUTE: LaunchRoute = "qr_first";

export function isOnboardingStep(value: string): value is OnboardingStepCode {
  return (ONBOARDING_STEPS as readonly string[]).includes(value);
}

export function isLaunchRoute(value: string | null | undefined): value is LaunchRoute {
  return !!value && (LAUNCH_ROUTES as readonly string[]).includes(value);
}

export function stepRequirement(step: OnboardingStepCode, route: LaunchRoute | null): StepRequirement {
  return STEP_REQUIREMENTS[step][route ?? DEFAULT_LAUNCH_ROUTE];
}

/** Optional steps may be skipped (recorded); required and not-applicable ones may not. */
export function canSkipStep(step: OnboardingStepCode, route: LaunchRoute | null): boolean {
  const requirement = stepRequirement(step, route);
  return requirement === "recommended" || requirement === "conditional";
}

export interface ProgressInput {
  route: LaunchRoute | null;
  completed: readonly string[];
  skipped: readonly string[];
}

/** Required steps (excluding go-live itself) not yet completed for the route. */
export function missingBeforeGolive(input: ProgressInput): OnboardingStepCode[] {
  const done = new Set(input.completed);
  return ONBOARDING_STEPS.filter(
    (step) => step !== "golive_approval" && stepRequirement(step, input.route) === "required" && !done.has(step),
  );
}

/**
 * The actionable step: first required step not completed, in checklist order.
 * Revisiting or completing other steps never moves it backwards.
 */
export function currentStep(input: ProgressInput): OnboardingStepCode {
  return missingBeforeGolive(input)[0] ?? "golive_approval";
}

export type StepState = "done" | "skipped" | "todo";

export interface StepProgress {
  code: OnboardingStepCode;
  requirement: StepRequirement;
  state: StepState;
}

export function describeSteps(input: ProgressInput): StepProgress[] {
  const done = new Set(input.completed);
  const skipped = new Set(input.skipped);
  return ONBOARDING_STEPS.map((code) => ({
    code,
    requirement: stepRequirement(code, input.route),
    state: done.has(code) ? "done" : skipped.has(code) ? "skipped" : "todo",
  }));
}

export function sanitizeStepList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && isOnboardingStep(item))
    : [];
}
