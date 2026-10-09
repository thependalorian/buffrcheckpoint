/** One deletion request with the facts the metrics need. */
export interface DeletionRequestFact {
  id: string;
  createdAt: Date;
  status: string;
  /** When the request first reached a closing status, or null while open. */
  closedAt: Date | null;
}

export interface DeletionTaskFact {
  requestId: string;
  system: string;
  status: string;
  attemptCount: number;
}

export interface DeletionMetrics {
  requestsReceived: number;
  requestsCompleted: number;
  /** Median hours from filing to completion over completed requests; null when none completed. */
  medianCompletionHours: number | null;
  /** Tasks finished by the workflow without a person. */
  tasksAutomated: number;
  /** Tasks that needed a person: they ended in the review queue. */
  tasksManual: number;
  /** Tasks currently waiting on a retry or a review: a processor or system that has not yet confirmed. */
  failedProcessorTasks: number;
  /** Requests blocked by a legal hold. */
  requestsOnHold: number;
  /** Mean number of distinct systems touched per request: the categories discovered. */
  systemsPerRequest: number | null;
  activeHolds: number;
  liveTombstones: number;
}

const COMPLETED = new Set(["completed", "partially_completed"]);

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Computes the deletion workflow figures shown on the compliance dashboard (DL-19). Pure: callers load the rows.
 * Restore-replay success is recorded by the replay script run after each restore, not here.
 */
export function computeDeletionMetrics(
  requests: DeletionRequestFact[],
  tasks: DeletionTaskFact[],
  activeHolds: number,
  liveTombstones: number,
): DeletionMetrics {
  const completed = requests.filter((r) => COMPLETED.has(r.status) && r.closedAt);
  const hours = completed.map((r) => ((r.closedAt as Date).getTime() - r.createdAt.getTime()) / 3_600_000);
  const requestIds = new Set(requests.map((r) => r.id));
  const own = tasks.filter((t) => requestIds.has(t.requestId));
  const systemsByRequest = new Map<string, Set<string>>();
  for (const t of own) {
    const set = systemsByRequest.get(t.requestId) ?? new Set<string>();
    set.add(t.system);
    systemsByRequest.set(t.requestId, set);
  }
  const perRequest = [...systemsByRequest.values()].map((s) => s.size);
  return {
    requestsReceived: requests.length,
    requestsCompleted: completed.length,
    medianCompletionHours: (() => {
      const m = median(hours);
      return m === null ? null : Math.round(m * 100) / 100;
    })(),
    tasksAutomated: own.filter((t) => t.status === "completed").length,
    tasksManual: own.filter((t) => t.status === "failed_requires_review").length,
    failedProcessorTasks: own.filter((t) => t.status === "failed_requires_review" || t.status === "retry_scheduled")
      .length,
    requestsOnHold: requests.filter((r) => r.status === "on_hold").length,
    systemsPerRequest:
      perRequest.length === 0
        ? null
        : Math.round((perRequest.reduce((a, b) => a + b, 0) / perRequest.length) * 100) / 100,
    activeHolds,
    liveTombstones,
  };
}
