// Organisation onboarding status machine (buffrcheckpoint.md §11 onboarding
// lifecycle, v0.33). Codes are type_definition rows in domain
// `organisation_onboarding_status`; this file only encodes which moves are legal.

export const ONBOARDING_STATUSES = [
  "pending_email_verification",
  "email_verified",
  "mfa_enrolled",
  "in_progress",
  "ready_for_golive",
  "live",
  "suspended",
] as const;

export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

/** Statuses a user's own activation (email verification, MFA enrolment) may advance an organisation to. */
export const EARLY_STAGE_STATUSES: readonly OnboardingStatus[] = [
  "pending_email_verification",
  "email_verified",
  "mfa_enrolled",
  "in_progress",
];

const PROGRESSION: readonly OnboardingStatus[] = [
  "pending_email_verification",
  "email_verified",
  "mfa_enrolled",
  "in_progress",
  "ready_for_golive",
  "live",
];

// MFA comes after onboarding (D-20), so `mfa_enrolled` is no longer a stage an organisation must pass through. The status stays valid
// so existing rows and history still read; new organisations go from email_verified straight to in_progress.
//
// Normal application flow. Anything else (backward moves, suspension,
// un-suspension) is an ops override with a recorded reason.
const FORWARD_EDGES: Readonly<Record<OnboardingStatus, readonly OnboardingStatus[]>> = {
  pending_email_verification: ["email_verified"],
  email_verified: ["mfa_enrolled", "in_progress"],
  mfa_enrolled: ["in_progress"],
  in_progress: ["ready_for_golive", "live"],
  ready_for_golive: ["live"],
  live: [],
  suspended: [],
};

export type TransitionMode = "forward" | "override";

export class IllegalOnboardingTransitionError extends Error {
  constructor(
    readonly from: OnboardingStatus | null,
    readonly to: OnboardingStatus,
    readonly mode: TransitionMode,
  ) {
    super(`Illegal onboarding transition ${from ?? "(none)"} -> ${to} (${mode})`);
    this.name = "IllegalOnboardingTransitionError";
  }
}

export function isOnboardingStatus(value: string | null | undefined): value is OnboardingStatus {
  return !!value && (ONBOARDING_STATUSES as readonly string[]).includes(value);
}

export function isTransitionAllowed(
  from: OnboardingStatus | null,
  to: OnboardingStatus,
  mode: TransitionMode = "forward",
): boolean {
  if (from === to) return false;
  if (from === null)
    return mode === "override" || to === "pending_email_verification" || EARLY_STAGE_STATUSES.includes(to);
  if (FORWARD_EDGES[from].includes(to)) return true;
  // Overrides may move anywhere except back to before the account existed.
  return mode === "override" && to !== "pending_email_verification";
}

export function assertTransition(
  from: OnboardingStatus | null,
  to: OnboardingStatus,
  mode: TransitionMode = "forward",
): void {
  if (!isTransitionAllowed(from, to, mode)) {
    throw new IllegalOnboardingTransitionError(from, to, mode);
  }
}

/**
 * Forward steps needed to bring `from` up to `target`, or [] when `from` is
 * already at or past it (including suspended). Used by user activation, which
 * must never regress an organisation that is further along.
 */
export function earlyStagePath(from: OnboardingStatus, target: OnboardingStatus): OnboardingStatus[] {
  if (!EARLY_STAGE_STATUSES.includes(target)) {
    throw new IllegalOnboardingTransitionError(from, target, "forward");
  }
  const fromIndex = PROGRESSION.indexOf(from);
  const targetIndex = PROGRESSION.indexOf(target);
  if (fromIndex < 0 || fromIndex >= targetIndex) return [];
  const path = PROGRESSION.slice(fromIndex + 1, targetIndex + 1) as OnboardingStatus[];
  // Skip the retired mfa_enrolled stage unless it is the explicit target (legacy callers).
  return target === "mfa_enrolled" ? path : path.filter((status) => status !== "mfa_enrolled");
}
