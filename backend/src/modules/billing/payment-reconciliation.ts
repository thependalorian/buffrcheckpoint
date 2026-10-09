/** One thing the scheduled reconciliation could not explain (MP-4). */
export interface ReconciliationBreak {
  kind: "confirmed_without_artifact" | "paid_invoice_underpaid" | "stale_pending_review" | "stale_initiated";
  paymentId: string | null;
  invoiceId: string | null;
}

export interface ReconcilePayment {
  id: string;
  invoiceId: string | null;
  amount: string;
  status: string;
  hasProcessorIndex: boolean;
  hasReconciliationRow: boolean;
  occurredAt: Date;
}

export interface ReconcileInvoice {
  id: string;
  amount: string;
  status: string;
}

export interface ReconcileInput {
  now: Date;
  invoices: ReconcileInvoice[];
  payments: ReconcilePayment[];
  /** Credit note amounts by invoice id. */
  creditsByInvoice: Map<string, number>;
  /** A pending_review payment older than this is a break; default 7 days. */
  reviewDeadlineMs?: number;
  /** An initiated card payment older than this with no result is a break; default 24 hours. */
  initiatedDeadlineMs?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Finds the money movements and invoices that do not reconcile. Pure: the caller loads the rows, so the rules are testable
 * without a database. Amounts are compared in cents to avoid float drift.
 *
 * A break is one of: a confirmed payment with neither a processor transaction index nor a review row; a paid invoice whose
 * confirmed payments plus credit notes fall short of its amount; a proof of payment waiting for review past the deadline;
 * a card payment started and never answered past the deadline.
 */
export function findReconciliationBreaks(input: ReconcileInput): ReconciliationBreak[] {
  const reviewDeadline = input.reviewDeadlineMs ?? 7 * DAY_MS;
  const initiatedDeadline = input.initiatedDeadlineMs ?? DAY_MS;
  const breaks: ReconciliationBreak[] = [];
  const cents = (value: string | number) => Math.round(Number(value) * 100);

  for (const payment of input.payments) {
    const age = input.now.getTime() - payment.occurredAt.getTime();
    if (payment.status === "confirmed" && !payment.hasProcessorIndex && !payment.hasReconciliationRow) {
      breaks.push({ kind: "confirmed_without_artifact", paymentId: payment.id, invoiceId: payment.invoiceId });
    }
    if (payment.status === "pending_review" && age > reviewDeadline) {
      breaks.push({ kind: "stale_pending_review", paymentId: payment.id, invoiceId: payment.invoiceId });
    }
    if (payment.status === "initiated" && age > initiatedDeadline) {
      breaks.push({ kind: "stale_initiated", paymentId: payment.id, invoiceId: payment.invoiceId });
    }
  }

  for (const invoice of input.invoices) {
    if (invoice.status !== "paid") continue;
    const confirmed = input.payments
      .filter((p) => p.invoiceId === invoice.id && p.status === "confirmed")
      .reduce((sum, p) => sum + cents(p.amount), 0);
    const credits = Math.round((input.creditsByInvoice.get(invoice.id) ?? 0) * 100);
    if (confirmed + credits < cents(invoice.amount)) {
      breaks.push({ kind: "paid_invoice_underpaid", paymentId: null, invoiceId: invoice.id });
    }
  }
  return breaks;
}
