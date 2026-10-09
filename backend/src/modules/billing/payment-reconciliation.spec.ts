import { findReconciliationBreaks, type ReconcilePayment } from "./payment-reconciliation";

const now = new Date("2026-10-09T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

function payment(over: Partial<ReconcilePayment>): ReconcilePayment {
  return {
    id: "p1",
    invoiceId: "i1",
    amount: "100.00",
    status: "confirmed",
    hasProcessorIndex: false,
    hasReconciliationRow: true,
    occurredAt: hoursAgo(1),
    ...over,
  };
}

describe("findReconciliationBreaks (MP-4)", () => {
  it("reports no break when every confirmed payment has an artifact and every paid invoice is covered", () => {
    const result = findReconciliationBreaks({
      now,
      invoices: [{ id: "i1", amount: "100.00", status: "paid" }],
      payments: [payment({})],
      creditsByInvoice: new Map(),
    });
    expect(result).toEqual([]);
  });

  it("flags a confirmed payment with neither a processor index nor a review row", () => {
    const result = findReconciliationBreaks({
      now,
      invoices: [],
      payments: [payment({ hasReconciliationRow: false, hasProcessorIndex: false })],
      creditsByInvoice: new Map(),
    });
    expect(result.map((b) => b.kind)).toEqual(["confirmed_without_artifact"]);
  });

  it("accepts a card payment that has a processor index but no review row", () => {
    const result = findReconciliationBreaks({
      now,
      invoices: [],
      payments: [payment({ hasReconciliationRow: false, hasProcessorIndex: true })],
      creditsByInvoice: new Map(),
    });
    expect(result).toEqual([]);
  });

  it("flags a paid invoice that payments and credit notes do not cover, counting in cents", () => {
    const base = { now, payments: [payment({ amount: "99.99" })] };
    expect(
      findReconciliationBreaks({
        ...base,
        invoices: [{ id: "i1", amount: "100.00", status: "paid" }],
        creditsByInvoice: new Map(),
      }).map((b) => b.kind),
    ).toEqual(["paid_invoice_underpaid"]);
    expect(
      findReconciliationBreaks({
        ...base,
        invoices: [{ id: "i1", amount: "100.00", status: "paid" }],
        creditsByInvoice: new Map([["i1", 0.01]]),
      }),
    ).toEqual([]);
  });

  it("ignores invoices that are not paid", () => {
    expect(
      findReconciliationBreaks({
        now,
        invoices: [{ id: "i1", amount: "100.00", status: "sent" }],
        payments: [],
        creditsByInvoice: new Map(),
      }),
    ).toEqual([]);
  });

  it("flags a proof of payment unreviewed past seven days and a card payment unanswered past a day", () => {
    const result = findReconciliationBreaks({
      now,
      invoices: [],
      payments: [
        payment({ id: "old-review", status: "pending_review", occurredAt: hoursAgo(24 * 8) }),
        payment({ id: "fresh-review", status: "pending_review", occurredAt: hoursAgo(24 * 6) }),
        payment({ id: "old-card", status: "initiated", occurredAt: hoursAgo(25) }),
        payment({ id: "fresh-card", status: "initiated", occurredAt: hoursAgo(2) }),
      ],
      creditsByInvoice: new Map(),
    });
    expect(result.map((b) => `${b.kind}:${b.paymentId}`)).toEqual([
      "stale_pending_review:old-review",
      "stale_initiated:old-card",
    ]);
  });
});
