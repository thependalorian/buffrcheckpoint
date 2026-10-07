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

/**
 * `auto` means the system completes the step from defaults (Onboarding v2): the owner is told it is done and can review it, but is
 * never asked to do it. It still counts toward go-live, and it reappears as a to-do if its evidence is later removed.
 */
export type StepRequirement = "required" | "auto" | "recommended" | "conditional" | "not_applicable";

const BOTH_REQUIRED = { qr_first: "required", kiosk: "required" } as const;
const BOTH_AUTO = { qr_first: "auto", kiosk: "auto" } as const;

export const STEP_REQUIREMENTS: Readonly<Record<OnboardingStepCode, Readonly<Record<LaunchRoute, StepRequirement>>>> = {
  // Done for the owner from what they typed at sign-up and from Checkpoint's defaults (organisation-defaults.service.ts).
  organisation_profile: BOTH_AUTO,
  site_hierarchy: BOTH_AUTO,
  hosts_departments: BOTH_AUTO,
  launch_route: BOTH_AUTO,
  // The one policy decision: accept Checkpoint's standard notice, retention and form, or change them first.
  notices_retention: BOTH_REQUIRED,
  visitor_categories: BOTH_AUTO,
  // The public site QR is created for the owner. A kiosk also needs a kiosk configuration, which is the owner's to make.
  check_in_channels: { qr_first: "auto", kiosk: "required" },
  risk_identity_approval: { qr_first: "recommended", kiosk: "recommended" },
  devices_mdm: { qr_first: "not_applicable", kiosk: "required" },
  flow_tests: BOTH_REQUIRED,
  // The owner's launch acknowledgement is given on the go-live confirmation, which completes this step.
  role_training: BOTH_AUTO,
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

/** Steps that must be complete before go-live: the required ones and the automatic ones (go-live itself excluded). */
function mustBeDone(requirement: StepRequirement): boolean {
  return requirement === "required" || requirement === "auto";
}

/** Required and automatic steps (excluding go-live itself) not yet completed for the route. */
export function missingBeforeGolive(input: ProgressInput): OnboardingStepCode[] {
  const done = new Set(input.completed);
  return ONBOARDING_STEPS.filter(
    (step) => step !== "golive_approval" && mustBeDone(stepRequirement(step, input.route)) && !done.has(step),
  );
}

/** The steps the system completes by itself on this route, in checklist order. */
export function autoSteps(route: LaunchRoute | null): OnboardingStepCode[] {
  return ONBOARDING_STEPS.filter((step) => stepRequirement(step, route) === "auto");
}

/**
 * The actionable step: first required step the owner has to do (an automatic step is the system's, not the owner's), in checklist
 * order, else go-live. Revisiting or completing other steps never moves it backwards.
 */
export function currentStep(input: ProgressInput): OnboardingStepCode {
  const open = missingBeforeGolive(input);
  return open.find((step) => stepRequirement(step, input.route) === "required") ?? open[0] ?? "golive_approval";
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
