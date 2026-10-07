import { BadRequestException } from "@nestjs/common";

import { BillingService } from "./billing.service";

const ORG = "3f2b8c1e-9a4d-4e7b-8c55-0d1f2a3b4c5d";

function setup(options: { existing?: unknown; sent?: number; unitPrice?: string; createFails?: boolean } = {}) {
  const findFirst = jest.fn();
  // First lookup is the "already invoiced?" check; a second one only happens after a failed insert.
  findFirst.mockResolvedValueOnce(options.existing ?? undefined);
  const db = { query: { invoice: { findFirst } } };
  const smsUsage = {
    usageFor: jest.fn().mockResolvedValue({
      month: "2026-09",
      sent: options.sent ?? 0,
      unitPrice: options.unitPrice ?? "1.00",
      limit: 1000,
    }),
  };
  const service = new BillingService(
    db as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    smsUsage as never,
  );
  const createInvoice = jest.spyOn(service, "createInvoice");
  if (options.createFails) createInvoice.mockRejectedValue(new Error("duplicate key idx_invoice_number"));
  else
    createInvoice.mockImplementation(
      async (dto) => ({ id: "inv-1", invoiceNumber: dto.invoiceNumber, amount: dto.amount }) as never,
    );
  return { service, createInvoice, findFirst, smsUsage };
}

describe("BillingService.createSmsUsageInvoice", () => {
  it("bills sent texts at N$1.00 each, with a fixed invoice number and a line that shows the arithmetic", async () => {
    const { service, createInvoice } = setup({ sent: 137 });
    const result = await service.createSmsUsageInvoice(ORG, "2026-09");
    expect(result).toMatchObject({ created: true, reason: null });
    const dto = createInvoice.mock.calls[0][0];
    expect(dto).toMatchObject({
      organisationId: ORG,
      invoiceNumber: "SMS-3F2B8C1E-202609",
      amount: "137.00",
      currencyCode: "NAD",
    });
    expect(dto.lineItems).toEqual([
      { description: "Text messages sent in September 2026: 137 at N$1.00 each", amount: "137.00", quantity: 137 },
    ]);
  });

  it("uses the organisation's own price when it has one", async () => {
    const { service, createInvoice } = setup({ sent: 10, unitPrice: "0.80" });
    await service.createSmsUsageInvoice(ORG, "2026-09");
    expect(createInvoice.mock.calls[0][0].amount).toBe("8.00");
  });

  it("never bills a month twice: an existing invoice is returned and nothing is created", async () => {
    const { service, createInvoice, smsUsage } = setup({
      existing: { id: "inv-0", invoiceNumber: "SMS-3F2B8C1E-202609" },
      sent: 5,
    });
    const result = await service.createSmsUsageInvoice(ORG, "2026-09");
    expect(result).toMatchObject({ created: false, reason: "already_invoiced" });
    expect(createInvoice).not.toHaveBeenCalled();
    expect(smsUsage.usageFor).not.toHaveBeenCalled();
  });

  it("creates nothing for a month with no texts", async () => {
    const { service, createInvoice } = setup({ sent: 0 });
    await expect(service.createSmsUsageInvoice(ORG, "2026-09")).resolves.toMatchObject({
      created: false,
      reason: "no_usage",
      invoice: null,
    });
    expect(createInvoice).not.toHaveBeenCalled();
  });

  it("refuses a month that has not ended, and a malformed month", async () => {
    const { service, createInvoice } = setup({ sent: 5 });
    const next = new Date(Date.now() + 40 * 86_400_000);
    const future = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
    await expect(service.createSmsUsageInvoice(ORG, future)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createSmsUsageInvoice(ORG, "September")).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.smsUsageForMonth(ORG, "2026-13")).rejects.toBeInstanceOf(BadRequestException);
    expect(createInvoice).not.toHaveBeenCalled();
  });

  it("returns the winner's invoice when a concurrent request created it first", async () => {
    const { service, findFirst } = setup({ sent: 5, createFails: true });
    findFirst.mockResolvedValueOnce({ id: "inv-9", invoiceNumber: "SMS-3F2B8C1E-202609" });
    await expect(service.createSmsUsageInvoice(ORG, "2026-09")).resolves.toMatchObject({
      created: false,
      reason: "already_invoiced",
    });
  });

  it("rethrows a real failure when no invoice exists", async () => {
    const { service, findFirst } = setup({ sent: 5, createFails: true });
    findFirst.mockResolvedValueOnce(undefined);
    await expect(service.createSmsUsageInvoice(ORG, "2026-09")).rejects.toThrow("duplicate key");
  });
});
