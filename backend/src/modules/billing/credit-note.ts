/**
 * Credit note arithmetic, kept pure so the money rules can be tested without a database. All amounts are handled as whole cents:
 * the database holds NUMERIC(15,2) and nothing here uses floating point for a decision.
 */
export class CreditNoteError extends Error {}

/** "12.50" -> 1250. Rejects anything that is not a positive amount with at most two decimals. */
export function parseCents(amount: string): number {
  const text = String(amount ?? "").trim();
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(text))
    throw new CreditNoteError("Amount must be a number with at most two decimals");
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents <= 0) throw new CreditNoteError("Amount must be greater than zero");
  return cents;
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export interface InvoiceSettlement {
  invoiceCents: number;
  confirmedPaymentCents: number;
  creditCents: number;
}

/** What is still owed: invoice, less confirmed payments, less credit notes already issued. Never negative. */
export function outstandingCents(s: InvoiceSettlement): number {
  return Math.max(0, s.invoiceCents - s.confirmedPaymentCents - s.creditCents);
}

/**
 * A credit note reduces what is owed. It may not exceed what is still outstanding: crediting a paid invoice would be a refund,
 * which is a different money movement with its own controls and is not handled here.
 */
export function assertCreditAllowed(s: InvoiceSettlement, creditCents: number): number {
  const owed = outstandingCents(s);
  if (creditCents > owed) {
    throw new CreditNoteError(`A credit note cannot exceed the outstanding balance of ${formatCents(owed)}`);
  }
  return owed - creditCents;
}

export function creditNoteNumber(invoiceNumber: string, existingCount: number): string {
  return `CN-${invoiceNumber}-${String(existingCount + 1).padStart(2, "0")}`;
}
