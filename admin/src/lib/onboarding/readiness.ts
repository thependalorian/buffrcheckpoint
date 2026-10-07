import type { OnboardingStepCode } from "@/lib/copy/onboarding";

export type LaunchRoute = "qr_first" | "kiosk";
/** `auto` steps are completed for the owner from Checkpoint's defaults; they are listed, never asked for. */
export type StepRequirement = "required" | "auto" | "recommended" | "conditional" | "not_applicable";
export type StepState = "done" | "skipped" | "todo";

export interface ReadinessStep {
  code: OnboardingStepCode;
  requirement: StepRequirement;
  state: StepState;
  missingEvidence: string[];
  /** Prerequisite evidence keys still missing before this step can start. */
  blockedBy: string[];
}

/** Business verification as ops decide it. `none` until the owner submits. */
export type KybStatus = "none" | "pending" | "verified" | "rejected" | "expired";

/** Everything go-live depends on, shown from the start (backend `goLive` block). */
export interface GoLiveBlock {
  subscription: { status: string | null; operationalUseAllowed: boolean };
  kyb: { status: KybStatus | string; submittedAt: string | null };
  /** Agreements (`terms`, `privacy`) whose current version the organisation has not accepted. */
  legalPending: string[];
  standardsAccepted: boolean;
  testArrivalDone: boolean;
  launchAcknowledged: boolean;
}

/** The organisation's standards as they stand now (backend `GET /auth/onboarding/standards`). */
export interface StandardsSummary {
  privacyNotice: { versionId: string; versionNumber: number; text: string | null; isStandard: boolean } | null;
  retention: { days: number; version: number; isStandard: boolean } | null;
  form: {
    definitionId: string;
    versionId: string;
    name: string | null;
    fields: Array<{ code: string; label: string; required: boolean }>;
  } | null;
  accepted: boolean;
  acceptedAt: string | null;
  ready: boolean;
}

export interface Readiness {
  status: string | null;
  /** When onboarding began; analytics report elapsed time from here. */
  startedAt: string;
  launchRoute: LaunchRoute | null;
  currentStep: OnboardingStepCode;
  missingBeforeGolive: OnboardingStepCode[];
  steps: ReadinessStep[];
  goLive: GoLiveBlock;
  /** Other administrators editing setup right now (advisory, §11.9.15.9). */
  editing: Array<{ stepCode: OnboardingStepCode; email: string }>;
}

/** The four visible treatments of §11.9.15.3. */
export type StepStatus = "ready" | "blocked" | "complete" | "not_needed";

/** Organisations that started before this date had the longer checklist; they keep every completion and get a one-line note. */
export const SETUP_REORGANISED_AT = "2026-10-08T00:00:00Z";

export function deriveStatus(step: ReadinessStep): StepStatus {
  if (step.state === "done") return "complete";
  if (step.state === "skipped") return "not_needed";
  if (step.requirement === "not_applicable" || step.requirement === "conditional") return "not_needed";
  if (step.blockedBy.length > 0) return "blocked";
  return "ready";
}

/** The three things the owner does on the default route, in order. Everything else is done for them or added later. */
export const OWNER_STEPS = ["flow_tests", "notices_retention", "golive_approval"] as const;
export type OwnerStep = (typeof OWNER_STEPS)[number];

/** How many of the owner's required steps are done, and how many there are: an honest count, never padded. */
export function ownerProgress(steps: readonly ReadinessStep[]): { done: number; total: number } {
  const required = steps.filter((step) => step.requirement === "required");
  return { done: required.filter((step) => step.state === "done").length, total: required.length };
}

/** Steps the system completed, or is completing, for the owner. Any of them not done is surfaced so nothing is silently wrong. */
export function autoSteps(steps: readonly ReadinessStep[]): ReadinessStep[] {
  return steps.filter((step) => step.requirement === "auto");
}

/** Things the owner can add whenever they like: optional, conditional and not-needed steps. */
export function addLaterSteps(steps: readonly ReadinessStep[]): ReadinessStep[] {
  return steps.filter(
    (step) =>
      step.requirement === "recommended" || step.requirement === "conditional" || step.requirement === "not_applicable",
  );
}

/** Organisations that started before setup was shortened keep every completion and get a one-line explanation. */
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
