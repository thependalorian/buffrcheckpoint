import {
  assertCreditAllowed,
  CreditNoteError,
  creditNoteNumber,
  formatCents,
  outstandingCents,
  parseCents,
} from "./credit-note";

describe("credit note money rules", () => {
  it("parses amounts to whole cents and rejects anything ambiguous", () => {
    expect(parseCents("12.5")).toBe(1250);
    expect(parseCents("0.01")).toBe(1);
    expect(parseCents("1450")).toBe(145000);
    for (const bad of ["0", "0.00", "-5", "1,50", "1.234", "abc", "", "1e3", "NaN"]) {
      expect(() => parseCents(bad)).toThrow(CreditNoteError);
    }
  });

  it("formats cents back without floating point drift", () => {
    expect(formatCents(1250)).toBe("12.50");
    expect(formatCents(5)).toBe("0.05");
    expect(formatCents(parseCents("19.99") + parseCents("0.01"))).toBe("20.00");
  });

  it("owes the invoice less confirmed payments and earlier credit notes, never below zero", () => {
    expect(outstandingCents({ invoiceCents: 100000, confirmedPaymentCents: 25000, creditCents: 5000 })).toBe(70000);
    expect(outstandingCents({ invoiceCents: 100000, confirmedPaymentCents: 100000, creditCents: 5000 })).toBe(0);
  });

  it("allows a credit up to the outstanding balance and returns the balance after it", () => {
    const s = { invoiceCents: 100000, confirmedPaymentCents: 25000, creditCents: 5000 };
    expect(assertCreditAllowed(s, 70000)).toBe(0);
    expect(assertCreditAllowed(s, 10000)).toBe(60000);
  });

  it("refuses a credit above what is owed, including on a paid invoice (that would be a refund)", () => {
    expect(() =>
      assertCreditAllowed({ invoiceCents: 100000, confirmedPaymentCents: 25000, creditCents: 0 }, 75001),
    ).toThrow(/cannot exceed the outstanding balance of 750.00/);
    expect(() =>
      assertCreditAllowed({ invoiceCents: 100000, confirmedPaymentCents: 100000, creditCents: 0 }, 1),
    ).toThrow(CreditNoteError);
  });

  it("numbers credit notes per invoice", () => {
    expect(creditNoteNumber("INV-2026-0042", 0)).toBe("CN-INV-2026-0042-01");
    expect(creditNoteNumber("INV-2026-0042", 11)).toBe("CN-INV-2026-0042-12");
  });
});
