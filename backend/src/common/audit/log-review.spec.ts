import { buildLogReview } from "./log-review";

const week = new Date("2026-10-09T00:00:00Z");

describe("buildLogReview (LG-5)", () => {
  it("counts events into groups and reports clear when no alert action was seen", () => {
    const r = buildLogReview(
      [
        "auth.sign_in",
        "privileged_access_grant.request",
        "dsar.resolve",
        "payment_transaction.submit_pop",
        "audit.chain_verified",
        "visit.check_out",
      ],
      "George Nekwaya",
      week,
    );
    expect(r.eventsReviewed).toBe(6);
    expect(r.groups).toEqual({
      sign_in_and_tokens: 1,
      privilege_and_access: 1,
      exports_and_deletions: 1,
      money: 1,
      integrity: 1,
    });
    expect(r.alerts).toEqual({});
    expect(r.outcome).toBe("clear");
    expect(r.weekEnding).toBe("2026-10-09");
  });

  it.each(["audit.chain_break_detected", "auth.refresh_token_reuse_detected", "payments.reconciliation_breaks_found"])(
    "needs attention on %s",
    (code) => {
      const r = buildLogReview(["visit.check_out", code, code], "George Nekwaya", week);
      expect(r.alerts).toEqual({ [code]: 2 });
      expect(r.outcome).toBe("needs_attention");
    },
  );

  it("refuses a record with no reviewer", () => {
    expect(() => buildLogReview([], "  ", week)).toThrow("reviewer");
  });
});
