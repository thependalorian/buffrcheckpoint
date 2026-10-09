/**
 * Pure rules of the account-deletion workflow (DL-1, DL-5, DL-7, DL-8, DL-10). No database, no clock reads: callers pass the time.
 */

export type DispositionSystem =
  | "credentials_and_sessions"
  | "application_user_profile"
  | "notification_outbox"
  | "billing_records"
  | "audit_chain"
  | "processors";

export type DispositionAction = "delete" | "anonymise" | "retain" | "notify_processor";
export type RetentionBasis = "financial_record" | "audit_integrity" | "security" | "dispute";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "retry_scheduled"
  | "failed_requires_review"
  | "not_applicable"
  | "retained_under_policy";

export interface PlannedTask {
  system: DispositionSystem;
  action: DispositionAction;
  /** Present when the data is kept on purpose: the reason it stays. */
  retentionBasis?: RetentionBasis;
}

/**
 * The tasks for one account closure, in the order they run. Access ends first, then the queued messages that
 * name the person are redacted, then the profile is erased (the profile task last of those, because it removes the address the
 * earlier tasks look the person up by). Financial and audit records are kept and restricted, never deleted to satisfy a request (DL-8).
 */
export function planAccountDeletion(): PlannedTask[] {
  return [
    { system: "credentials_and_sessions", action: "delete" },
    { system: "notification_outbox", action: "anonymise" },
    { system: "application_user_profile", action: "anonymise" },
    { system: "billing_records", action: "retain", retentionBasis: "financial_record" },
    { system: "audit_chain", action: "retain", retentionBasis: "audit_integrity" },
    { system: "processors", action: "notify_processor" },
  ];
}

/** Idempotency key for a task: a repeat of the same request and system finds the same row. */
export function taskKey(requestId: string, system: DispositionSystem): string {
  return `${requestId}:${system}`;
}

export const MAX_TASK_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 60 * 60 * 1000;

/** What happens to a task whose attempt just failed: retry later with exponential backoff, or go to the review queue past the cap. */
export function nextAfterFailure(
  attemptCount: number,
  now: Date,
): { status: "retry_scheduled"; nextAttemptAt: Date } | { status: "failed_requires_review"; nextAttemptAt: null } {
  if (attemptCount >= MAX_TASK_ATTEMPTS) return { status: "failed_requires_review", nextAttemptAt: null };
  const delay = Math.min(BACKOFF_BASE_MS * 2 ** (attemptCount - 1), BACKOFF_CAP_MS);
  return { status: "retry_scheduled", nextAttemptAt: new Date(now.getTime() + delay) };
}

const TERMINAL: ReadonlySet<TaskStatus> = new Set([
  "completed",
  "not_applicable",
  "retained_under_policy",
  "failed_requires_review",
]);

export function isTerminal(status: TaskStatus): boolean {
  return TERMINAL.has(status);
}

/** True when a task is due to run: pending, or a retry whose time has come. */
export function isDue(task: { status: TaskStatus; nextAttemptAt: Date | null }, now: Date): boolean {
  if (task.status === "pending") return true;
  return (
    task.status === "retry_scheduled" && (task.nextAttemptAt === null || task.nextAttemptAt.getTime() <= now.getTime())
  );
}

/**
 * The status of the whole request once its tasks are known. It is complete only when every task is terminal and none needs review
 * (DL-7); a request with a task that failed past the cap is partially completed and goes to a person.
 */
export function requestOutcome(statuses: TaskStatus[]): "in_progress" | "completed" | "partially_completed" {
  if (statuses.some((status) => !isTerminal(status))) return "in_progress";
  return statuses.some((status) => status === "failed_requires_review") ? "partially_completed" : "completed";
}

/** A legal hold takes precedence over erasure (DL-17). A hold names the subject by reference, user id, or covers the whole organisation. */
export function holdBlocksDeletion(
  holds: Array<{ scope: Record<string, unknown> }>,
  subject: { reference: string; userId: string | null },
): boolean {
  return holds.some(({ scope }) => {
    if (scope.allSubjects === true) return true;
    return (
      (typeof scope.subjectReference === "string" &&
        scope.subjectReference.toLowerCase() === subject.reference.toLowerCase()) ||
      (subject.userId !== null && scope.userId === subject.userId)
    );
  });
}

export const DEFAULT_REPLAY_DAYS = 35;

/** How long a tombstone is kept: past the oldest backup that could still hold the person (14 day snapshots plus margin). */
export function replayUntil(erasedAt: Date, days: number = DEFAULT_REPLAY_DAYS): Date {
  return new Date(erasedAt.getTime() + days * 24 * 60 * 60 * 1000);
}
