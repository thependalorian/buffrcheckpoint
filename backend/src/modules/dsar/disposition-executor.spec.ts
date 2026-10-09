import {
  type DispositionSystem,
  type PlannedTask,
  planAccountDeletion,
  type TaskStatus,
  taskKey,
} from "./deletion-plan";
import {
  type DispositionStore,
  type DispositionTaskRow,
  type HandlerResult,
  runDueTasks,
  safeFailureReason,
  type TaskHandler,
} from "./disposition-executor";

class MemoryStore implements DispositionStore {
  rows = new Map<string, DispositionTaskRow & { key: string; request: string }>();
  log: string[] = [];
  async ensureTasks(requestId: string, planned: PlannedTask[]) {
    for (const p of planned) {
      const key = taskKey(requestId, p.system);
      if ([...this.rows.values()].some((r) => r.key === key)) continue;
      const id = `t${this.rows.size + 1}`;
      this.rows.set(id, {
        id,
        key,
        request: requestId,
        system: p.system,
        action: p.action,
        status: "pending",
        attemptCount: 0,
        nextAttemptAt: null,
        retentionBasis: p.retentionBasis ?? null,
      });
    }
  }
  async tasksFor(requestId: string) {
    return [...this.rows.values()].filter((r) => r.request === requestId);
  }
  async transition(
    taskId: string,
    to: TaskStatus,
    reasonCode: string,
    patch: { attemptCount?: number; nextAttemptAt?: Date | null } = {},
  ) {
    const row = this.rows.get(taskId);
    if (!row) return;
    this.log.push(`${row.system}:${row.status}->${to}:${reasonCode}`);
    row.status = to;
    if (patch.attemptCount !== undefined) row.attemptCount = patch.attemptCount;
    if (patch.nextAttemptAt !== undefined) row.nextAttemptAt = patch.nextAttemptAt;
  }
}

const now = new Date("2026-10-08T12:00:00.000Z");
const ok =
  (outcome: HandlerResult["outcome"]): TaskHandler =>
  async () => ({ outcome });

function handlers(
  overrides: Partial<Record<DispositionSystem, TaskHandler>> = {},
): Record<DispositionSystem, TaskHandler> {
  return {
    credentials_and_sessions: ok("completed"),
    application_user_profile: ok("completed"),
    notification_outbox: ok("completed"),
    billing_records: ok("retained"),
    audit_chain: ok("retained"),
    processors: ok("not_applicable"),
    ...overrides,
  };
}

async function started() {
  const store = new MemoryStore();
  await store.ensureTasks("r1", planAccountDeletion());
  return store;
}

describe("disposition executor (DL-7)", () => {
  it("runs every task to a terminal status and records retained records as retained", async () => {
    const store = await started();
    const statuses = await runDueTasks(store, handlers(), "r1", now);
    expect(statuses).toEqual([
      "completed",
      "completed",
      "completed",
      "retained_under_policy",
      "retained_under_policy",
      "not_applicable",
    ]);
  });

  it("is idempotent: creating the tasks again and running again does nothing more", async () => {
    const store = await started();
    await runDueTasks(store, handlers(), "r1", now);
    const logged = store.log.length;
    await store.ensureTasks("r1", planAccountDeletion());
    expect(store.rows.size).toBe(6);
    await runDueTasks(store, handlers(), "r1", now);
    expect(store.log.length).toBe(logged);
  });

  it("schedules a retry for a failing task and runs it once the backoff has passed", async () => {
    const store = await started();
    let calls = 0;
    const flaky: TaskHandler = async () => {
      calls++;
      if (calls === 1) throw Object.assign(new Error("timeout for person@example.org"), { code: "ETIMEDOUT" });
      return { outcome: "completed" };
    };
    const first = await runDueTasks(store, handlers({ notification_outbox: flaky }), "r1", now);
    expect(first[1]).toBe("retry_scheduled");

    const tooSoon = await runDueTasks(
      store,
      handlers({ notification_outbox: flaky }),
      "r1",
      new Date(now.getTime() + 10_000),
    );
    expect(tooSoon[1]).toBe("retry_scheduled");
    expect(calls).toBe(1);

    const later = await runDueTasks(
      store,
      handlers({ notification_outbox: flaky }),
      "r1",
      new Date(now.getTime() + 31_000),
    );
    expect(later[1]).toBe("completed");
    expect(calls).toBe(2);
  });

  it("sends a task that keeps failing to the review queue after five attempts", async () => {
    const store = await started();
    const alwaysFails: TaskHandler = async () => {
      throw new Error("down");
    };
    let clock = now.getTime();
    let statuses: TaskStatus[] = [];
    for (let i = 0; i < 6; i++) {
      statuses = await runDueTasks(store, handlers({ notification_outbox: alwaysFails }), "r1", new Date(clock));
      clock += 2 * 60 * 60 * 1000;
    }
    expect(statuses[1]).toBe("failed_requires_review");
    expect([...store.rows.values()].find((r) => r.system === "notification_outbox")?.attemptCount).toBe(5);
  });

  it("stops before touching anything else when the access task fails", async () => {
    const store = await started();
    const statuses = await runDueTasks(
      store,
      handlers({
        credentials_and_sessions: async () => {
          throw new Error("down");
        },
      }),
      "r1",
      now,
    );
    expect(statuses[0]).toBe("retry_scheduled");
    expect(statuses.slice(1).every((s) => s === "pending")).toBe(true);
  });

  it("keeps personal data out of the recorded failure reason", () => {
    const reason = safeFailureReason(Object.assign(new Error("failed for person@example.org"), { code: "ETIMEDOUT" }));
    expect(reason).toBe("Error:ETIMEDOUT");
    expect(reason).not.toContain("@");
  });
});
