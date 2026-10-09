import { computeDeletionMetrics, type DeletionRequestFact, type DeletionTaskFact } from "./deletion-metrics";

const t0 = new Date("2026-10-01T00:00:00Z");
const hoursLater = (h: number) => new Date(t0.getTime() + h * 3_600_000);
const req = (id: string, status: string, closedH: number | null): DeletionRequestFact => ({
  id,
  createdAt: t0,
  status,
  closedAt: closedH === null ? null : hoursLater(closedH),
});
const task = (requestId: string, system: string, status: string): DeletionTaskFact => ({
  requestId,
  system,
  status,
  attemptCount: 1,
});

describe("computeDeletionMetrics (DL-19)", () => {
  it("returns zeros and nulls for an organisation with no deletion requests", () => {
    expect(computeDeletionMetrics([], [], 0, 0)).toEqual({
      requestsReceived: 0,
      requestsCompleted: 0,
      medianCompletionHours: null,
      tasksAutomated: 0,
      tasksManual: 0,
      failedProcessorTasks: 0,
      requestsOnHold: 0,
      systemsPerRequest: null,
      activeHolds: 0,
      liveTombstones: 0,
    });
  });

  it("takes the median completion time over completed requests only", () => {
    const m = computeDeletionMetrics(
      [req("a", "completed", 2), req("b", "completed", 10), req("c", "completed", 4), req("d", "in_progress", null)],
      [],
      0,
      0,
    );
    expect(m.requestsReceived).toBe(4);
    expect(m.requestsCompleted).toBe(3);
    expect(m.medianCompletionHours).toBe(4);
  });

  it("averages the two middle values for an even count", () => {
    const m = computeDeletionMetrics([req("a", "completed", 2), req("b", "completed", 4)], [], 0, 0);
    expect(m.medianCompletionHours).toBe(3);
  });

  it("splits tasks into automated and manual, counts failures and systems per request, and ignores other requests' tasks", () => {
    const m = computeDeletionMetrics(
      [req("a", "completed", 1), req("b", "on_hold", null)],
      [
        task("a", "login", "completed"),
        task("a", "files", "completed"),
        task("b", "login", "failed_requires_review"),
        task("b", "mail", "retry_scheduled"),
        task("other", "login", "completed"),
      ],
      2,
      5,
    );
    expect(m.tasksAutomated).toBe(2);
    expect(m.tasksManual).toBe(1);
    expect(m.failedProcessorTasks).toBe(2);
    expect(m.requestsOnHold).toBe(1);
    expect(m.systemsPerRequest).toBe(2);
    expect(m.activeHolds).toBe(2);
    expect(m.liveTombstones).toBe(5);
  });
});
