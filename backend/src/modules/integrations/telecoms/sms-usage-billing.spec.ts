import {
  amountToCents,
  centsToAmount,
  currentBillingMonth,
  isMonthClosed,
  parseBillingMonth,
  smsUsageInvoiceNumber,
  usageAmount,
} from "./sms-usage-billing";

describe("sms usage amounts", () => {
  it("charges N$1.00 a message with no rounding drift", () => {
    expect(usageAmount(0, "1.00")).toBe("0.00");
    expect(usageAmount(1, "1.00")).toBe("1.00");
    expect(usageAmount(137, "1.00")).toBe("137.00");
    expect(usageAmount(3, "0.35")).toBe("1.05");
    expect(usageAmount(10_000, "1.00")).toBe("10000.00");
  });

  it("converts only plain two-decimal amounts", () => {
    expect(amountToCents("1.00")).toBe(100);
    expect(amountToCents("0.05")).toBe(5);
    for (const bad of ["1", "1.0", "1.000", "-1.00", "1,00", "abc", "", "1e2"]) expect(amountToCents(bad)).toBeNull();
    expect(centsToAmount(5)).toBe("0.05");
    expect(centsToAmount(12345)).toBe("123.45");
    expect(() => usageAmount(2, "free")).toThrow();
  });
});

describe("billing months (Windhoek, UTC+2)", () => {
  it("starts a month at local midnight, which is 22:00 UTC the day before", () => {
    const october = parseBillingMonth("2026-10");
    expect(october?.start.toISOString()).toBe("2026-09-30T22:00:00.000Z");
    expect(october?.end.toISOString()).toBe("2026-10-31T22:00:00.000Z");
    expect(october?.label).toBe("October 2026");
    expect(parseBillingMonth("2026-12")?.end.toISOString()).toBe("2026-12-31T22:00:00.000Z");
  });

  it("rejects anything that is not YYYY-MM", () => {
    for (const bad of ["2026-13", "2026-00", "26-10", "2026-1", "2026-10-01", "October", ""]) {
      expect(parseBillingMonth(bad)).toBeNull();
    }
  });

  it("finds the current month in Windhoek, not UTC", () => {
    expect(currentBillingMonth(new Date("2026-10-31T21:59:00Z")).key).toBe("2026-10");
    expect(currentBillingMonth(new Date("2026-10-31T22:01:00Z")).key).toBe("2026-11");
  });

  it("lets a month be invoiced only after it has ended", () => {
    const october = parseBillingMonth("2026-10");
    if (!october) throw new Error("month");
    expect(isMonthClosed(october, new Date("2026-10-31T21:59:59Z"))).toBe(false);
    expect(isMonthClosed(october, new Date("2026-10-31T22:00:00Z"))).toBe(true);
  });

  it("gives one invoice number per organisation and month", () => {
    const october = parseBillingMonth("2026-10");
    if (!october) throw new Error("month");
    const org = "3f2b8c1e-9a4d-4e7b-8c55-0d1f2a3b4c5d";
    expect(smsUsageInvoiceNumber(org, october)).toBe("SMS-3F2B8C1E-202610");
    expect(smsUsageInvoiceNumber(org, october)).toBe(smsUsageInvoiceNumber(org, october));
    expect(smsUsageInvoiceNumber("aaaaaaaa-0000-0000-0000-000000000000", october)).not.toBe(
      smsUsageInvoiceNumber(org, october),
    );
  });
});
