import type { OnboardingStepCode } from "@/lib/copy/onboarding";

export type LaunchRoute = "qr_first" | "kiosk";
export type StepRequirement = "required" | "recommended" | "conditional" | "not_applicable";
export type StepState = "done" | "skipped" | "todo";

export interface ReadinessStep {
  code: OnboardingStepCode;
  requirement: StepRequirement;
  state: StepState;
  missingEvidence: string[];
  /** Prerequisite evidence keys still missing before this step can start. */
  blockedBy: string[];
}

export interface Readiness {
  status: string | null;
  /** When onboarding began; analytics report elapsed time from here. */
  startedAt: string;
  launchRoute: LaunchRoute | null;
  currentStep: OnboardingStepCode;
  missingBeforeGolive: OnboardingStepCode[];
  steps: ReadinessStep[];
  /** Other administrators editing setup right now (advisory, §11.9.15.9). */
  editing: Array<{ stepCode: OnboardingStepCode; email: string }>;
}

/** The four visible treatments of §11.9.15.3. */
export type StepStatus = "ready" | "blocked" | "complete" | "not_needed";

export const REQUIREMENT_ORDER: readonly StepRequirement[] = [
  "required",
  "recommended",
  "conditional",
  "not_applicable",
];

/** Steps that must be done before a site can accept its first check-in, in checklist order. */
export const FIRST_CHECK_IN_STEPS: readonly OnboardingStepCode[] = [
  "organisation_profile",
  "site_hierarchy",
  "hosts_departments",
  "launch_route",
  "notices_retention",
  "visitor_categories",
  "check_in_channels",
];

/**
 * Organisations that started before the checklist was reorganised (v0.33/v0.34
 * release, 2026-10-05) keep every completion and get a one-line explanation.
 */
export const SETUP_REORGANISED_AT = "2026-10-06T00:00:00Z";

export function deriveStatus(step: ReadinessStep): StepStatus {
  if (step.state === "done") return "complete";
  if (step.state === "skipped") return "not_needed";
  if (step.requirement === "not_applicable" || step.requirement === "conditional") return "not_needed";
  if (step.blockedBy.length > 0) return "blocked";
  return "ready";
}

/** Groups checklist steps by requirement, keeping checklist order inside each group; empty groups are dropped. */
export function groupByRequirement(steps: readonly ReadinessStep[]) {
  return REQUIREMENT_ORDER.map((requirement) => ({
    requirement,
    steps: steps.filter((step) => step.requirement === requirement),
  })).filter((group) => group.steps.length > 0);
}

/** Required steps still open before the first check-in, which the header counts. */
export function stepsToFirstCheckIn(steps: readonly ReadinessStep[]): number {
  return steps.filter(
    (step) => FIRST_CHECK_IN_STEPS.includes(step.code) && step.requirement === "required" && step.state !== "done",
  ).length;
}

/**
 * The one action the home page leads with: the server's current step (first
 * required incomplete step). If that step is blocked, its first prerequisite's
 * step comes first instead, so the card is always actionable.
 */
export function nextBestAction(readiness: Pick<Readiness, "currentStep" | "steps">): ReadinessStep | null {
  const current = readiness.steps.find((step) => step.code === readiness.currentStep);
  if (!current || current.state === "done") return null;
  if (current.blockedBy.length === 0) return current;
  return (
    readiness.steps.find(
      (step) => step.state !== "done" && step.blockedBy.length === 0 && step.requirement === "required",
    ) ?? current
  );
}

export function showReorganisedNote(readiness: Pick<Readiness, "startedAt" | "launchRoute" | "steps">): boolean {
  const started = Date.parse(readiness.startedAt);
  return (
    !Number.isNaN(started) &&
    started < Date.parse(SETUP_REORGANISED_AT) &&
    readiness.launchRoute === null &&
    readiness.steps.some((step) => step.state === "done")
  );
}

export function elapsedSeconds(startedAt: string, now: number = Date.now()): number {
  const started = Date.parse(startedAt);
  return Number.isNaN(started) ? 0 : Math.max(0, Math.round((now - started) / 1000));
}

/** Steps whose evidence can be recorded straight from the step page. */
export const EVIDENCE_ACTION_STEPS = ["role_training"] as const;
export type EvidenceActionStep = (typeof EVIDENCE_ACTION_STEPS)[number];

export function isEvidenceActionStep(stepCode: string): stepCode is EvidenceActionStep {
  return (EVIDENCE_ACTION_STEPS as readonly string[]).includes(stepCode);
}
