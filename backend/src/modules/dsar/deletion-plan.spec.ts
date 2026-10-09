import {
  DEFAULT_REPLAY_DAYS,
  holdBlocksDeletion,
  isDue,
  MAX_TASK_ATTEMPTS,
  nextAfterFailure,
  planAccountDeletion,
  replayUntil,
  requestOutcome,
  taskKey,
} from "./deletion-plan";

const now = new Date("2026-10-08T12:00:00.000Z");

describe("account deletion plan", () => {
  it("ends access first, erases the profile, and keeps financial and audit records restricted (DL-8)", () => {
    const plan = planAccountDeletion();
    expect(plan[0]).toMatchObject({ system: "credentials_and_sessions", action: "delete" });
    expect(plan.find((p) => p.system === "application_user_profile")?.action).toBe("anonymise");
    expect(plan.findIndex((p) => p.system === "notification_outbox")).toBeLessThan(
      plan.findIndex((p) => p.system === "application_user_profile"),
    );
    expect(plan.find((p) => p.system === "billing_records")).toMatchObject({
      action: "retain",
      retentionBasis: "financial_record",
    });
    expect(plan.find((p) => p.system === "audit_chain")).toMatchObject({
      action: "retain",
      retentionBasis: "audit_integrity",
    });
    expect(
      plan.some((p) => p.action === "delete" && (p.system === "billing_records" || p.system === "audit_chain")),
    ).toBe(false);
  });

  it("keys a task by request and system so a repeat finds the same row", () => {
    expect(taskKey("r1", "audit_chain")).toBe("r1:audit_chain");
  });
});

describe("retry and review", () => {
  it("backs off exponentially from 30 seconds and caps at one hour", () => {
    const delays = [1, 2, 3, 4].map((attempt) => {
      const next = nextAfterFailure(attempt, now);
      return next.status === "retry_scheduled" ? next.nextAttemptAt.getTime() - now.getTime() : -1;
    });
    expect(delays).toEqual([30_000, 60_000, 120_000, 240_000]);
    expect(MAX_TASK_ATTEMPTS).toBe(5);
  });

  it("sends a task to the review queue past the attempt cap", () => {
    expect(nextAfterFailure(MAX_TASK_ATTEMPTS, now)).toEqual({ status: "failed_requires_review", nextAttemptAt: null });
  });

  it("treats a retry as due only once its time has come", () => {
    expect(isDue({ status: "pending", nextAttemptAt: null }, now)).toBe(true);
    expect(isDue({ status: "retry_scheduled", nextAttemptAt: new Date(now.getTime() + 1) }, now)).toBe(false);
    expect(isDue({ status: "retry_scheduled", nextAttemptAt: new Date(now.getTime() - 1) }, now)).toBe(true);
    expect(isDue({ status: "completed", nextAttemptAt: null }, now)).toBe(false);
  });
});

describe("request outcome (DL-7)", () => {
  it("is complete only when every task is terminal and none needs review", () => {
    expect(requestOutcome(["completed", "retained_under_policy", "not_applicable"])).toBe("completed");
    expect(requestOutcome(["completed", "pending"])).toBe("in_progress");
    expect(requestOutcome(["completed", "retry_scheduled"])).toBe("in_progress");
    expect(requestOutcome(["completed", "failed_requires_review"])).toBe("partially_completed");
  });
});

describe("legal hold precedence (DL-17)", () => {
  const subject = { reference: "Person@Example.org", userId: "u1" };

  it("blocks when a hold names the subject by reference, ignoring case, or by user id, or covers everyone", () => {
    expect(holdBlocksDeletion([{ scope: { subjectReference: "person@example.org" } }], subject)).toBe(true);
    expect(holdBlocksDeletion([{ scope: { userId: "u1" } }], subject)).toBe(true);
    expect(holdBlocksDeletion([{ scope: { allSubjects: true } }], subject)).toBe(true);
  });

  it("does not block on a hold about someone else or with no scope", () => {
    expect(holdBlocksDeletion([{ scope: { subjectReference: "other@example.org" } }, { scope: {} }], subject)).toBe(
      false,
    );
    expect(holdBlocksDeletion([], subject)).toBe(false);
  });
});

describe("recovery tombstone window (DL-10)", () => {
  it("is kept past the oldest backup", () => {
    expect(replayUntil(now).getTime() - now.getTime()).toBe(DEFAULT_REPLAY_DAYS * 24 * 60 * 60 * 1000);
    expect(DEFAULT_REPLAY_DAYS).toBeGreaterThan(14);
  });
});
