import {
  type DispositionAction,
  type DispositionSystem,
  isDue,
  isTerminal,
  nextAfterFailure,
  type PlannedTask,
  type RetentionBasis,
  type TaskStatus,
} from "./deletion-plan";

export interface DispositionTaskRow {
  id: string;
  system: DispositionSystem;
  action: DispositionAction;
  status: TaskStatus;
  attemptCount: number;
  nextAttemptAt: Date | null;
  retentionBasis: RetentionBasis | null;
}

/** Storage for disposition tasks. The database implementation is in AccountDeletionService; tests use an in-memory one. */
export interface DispositionStore {
  /** Creates any planned task that does not exist yet, keyed by request and system, so a repeat creates nothing. */
  ensureTasks(requestId: string, planned: PlannedTask[]): Promise<void>;
  /** The request's tasks, in plan order. */
  tasksFor(requestId: string): Promise<DispositionTaskRow[]>;
  /** Moves a task to a new status and appends the change to its status log. */
  transition(
    taskId: string,
    to: TaskStatus,
    reasonCode: string,
    patch?: {
      attemptCount?: number;
      lastError?: string | null;
      nextAttemptAt?: Date | null;
      externalReference?: string;
    },
  ): Promise<void>;
}

export type HandlerResult =
  | { outcome: "completed"; externalReference?: string }
  | { outcome: "retained"; externalReference?: string }
  | { outcome: "not_applicable"; externalReference?: string };

export type TaskHandler = () => Promise<HandlerResult>;

/** A failure reason that cannot carry personal data: the error class and code only, never its message. */
export function safeFailureReason(error: unknown): string {
  const name = error instanceof Error ? error.constructor.name : "Error";
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? `${name}:${code}` : name;
}

/**
 * Runs the tasks of one request that are due (DL-7). Each handler is idempotent, so a task is safe to run again.
 * A task that throws is retried with exponential backoff and goes to the review queue past the attempt cap. A failure of the access
 * task stops the run, because nothing after it should happen while the person can still sign in.
 *
 * @returns The status of every task after the run, in plan order.
 */
export async function runDueTasks(
  store: DispositionStore,
  handlers: Record<DispositionSystem, TaskHandler>,
  requestId: string,
  now: Date,
): Promise<TaskStatus[]> {
  for (const task of await store.tasksFor(requestId)) {
    if (isTerminal(task.status) || !isDue(task, now)) continue;
    const attempt = task.attemptCount + 1;
    await store.transition(task.id, "running", "attempt_started", { attemptCount: attempt });
    try {
      const result = await handlers[task.system]();
      const status: TaskStatus =
        result.outcome === "completed"
          ? "completed"
          : result.outcome === "retained"
            ? "retained_under_policy"
            : "not_applicable";
      await store.transition(task.id, status, result.outcome, {
        lastError: null,
        nextAttemptAt: null,
        externalReference: result.externalReference,
      });
    } catch (error) {
      const next = nextAfterFailure(attempt, now);
      await store.transition(task.id, next.status, "attempt_failed", {
        lastError: safeFailureReason(error),
        nextAttemptAt: next.nextAttemptAt,
      });
      if (task.system === "credentials_and_sessions") break;
    }
  }
  return (await store.tasksFor(requestId)).map((task) => task.status);
}
