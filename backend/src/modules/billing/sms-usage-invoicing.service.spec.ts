import { lastClosedBillingMonths } from "../integrations/telecoms/sms-usage-billing";
import { SMS_INVOICING_LOOKBACK_MONTHS, SmsUsageInvoicingService } from "./sms-usage-invoicing.service";
import { SmsUsageInvoicingWorkerService } from "./sms-usage-invoicing-worker.service";

describe("lastClosedBillingMonths", () => {
  it("lists the finished months newest first and never the month in progress", () => {
    const keys = lastClosedBillingMonths(3, new Date("2026-10-15T10:00:00Z")).map((m) => m.key);
    expect(keys).toEqual(["2026-09", "2026-08", "2026-07"]);
  });

  it("crosses a year boundary", () => {
    expect(lastClosedBillingMonths(3, new Date("2026-01-10T10:00:00Z")).map((m) => m.key)).toEqual([
      "2025-12",
      "2025-11",
      "2025-10",
    ]);
  });

  it("uses Windhoek time: late on the last UTC day of a month is already the next month", () => {
    // 23:30 UTC on 31 October is 01:30 on 1 November in Windhoek, so October has just ended and is the newest closed month.
    expect(lastClosedBillingMonths(1, new Date("2026-10-31T23:30:00Z"))[0].key).toBe("2026-10");
    expect(lastClosedBillingMonths(1, new Date("2026-10-31T21:30:00Z"))[0].key).toBe("2026-09");
  });
});

describe("SmsUsageInvoicingService", () => {
  const NOW = new Date("2026-10-15T10:00:00Z");

  function setup(usageByMonth: Record<string, string[]>, outcomes: Record<string, unknown> = {}) {
    const usage = {
      organisationsWithUsage: jest.fn(async (start: Date) => {
        const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
        // A Windhoek month starts at 22:00 UTC the day before, so read the month from two hours later.
        const local = new Date(start.getTime() + 2 * 3_600_000);
        const k = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
        return usageByMonth[k] ?? usageByMonth[key] ?? [];
      }),
    };
    const billing = {
      createSmsUsageInvoice: jest.fn(async (org: string, month: string) => {
        const outcome = outcomes[`${org}:${month}`];
        if (outcome instanceof Error) throw outcome;
        return outcome ?? { created: true, reason: null, invoice: { id: "i" } };
      }),
    };
    return { service: new SmsUsageInvoicingService(billing as never, usage as never), billing, usage };
  }

  it("looks back over a few finished months and invoices each organisation that sent texts", async () => {
    const { service, billing } = setup({ "2026-09": ["org-a", "org-b"], "2026-08": ["org-a"] });
    const run = await service.run(NOW);
    expect(run.months).toHaveLength(SMS_INVOICING_LOOKBACK_MONTHS);
    expect(run).toMatchObject({ created: 3, alreadyInvoiced: 0, failed: 0 });
    expect(billing.createSmsUsageInvoice.mock.calls.map((c) => `${c[0]}:${c[1]}`).sort()).toEqual([
      "org-a:2026-08",
      "org-a:2026-09",
      "org-b:2026-09",
    ]);
  });

  it("counts a month that is already invoiced and creates nothing for it", async () => {
    const { service } = setup(
      { "2026-09": ["org-a"] },
      { "org-a:2026-09": { created: false, reason: "already_invoiced", invoice: { id: "i" } } },
    );
    expect(await service.run(NOW)).toMatchObject({ created: 0, alreadyInvoiced: 1, failed: 0 });
  });

  it("keeps going when one organisation fails, and counts the failure", async () => {
    const { service, billing } = setup({ "2026-09": ["org-a", "org-b"] }, { "org-a:2026-09": new Error("boom") });
    const run = await service.run(NOW);
    expect(run).toMatchObject({ created: 1, failed: 1 });
    expect(billing.createSmsUsageInvoice).toHaveBeenCalledTimes(2);
  });

  it("does nothing, and costs nothing, when no text was sent", async () => {
    const { service, billing } = setup({});
    expect(await service.run(NOW)).toMatchObject({ created: 0, alreadyInvoiced: 0, failed: 0 });
    expect(billing.createSmsUsageInvoice).not.toHaveBeenCalled();
  });
});

describe("SmsUsageInvoicingWorkerService", () => {
  afterEach(() => {
    delete process.env.SMS_USAGE_INVOICING_ENABLED;
    jest.useRealTimers();
  });

  it("stays off unless SMS_USAGE_INVOICING_ENABLED is true", () => {
    jest.useFakeTimers();
    const invoicing = { run: jest.fn().mockResolvedValue({}) };
    const worker = new SmsUsageInvoicingWorkerService(invoicing as never);
    worker.onModuleInit();
    jest.advanceTimersByTime(24 * 3_600_000);
    expect(invoicing.run).not.toHaveBeenCalled();
    worker.onModuleDestroy();
  });

  it("runs once shortly after start and then on its interval when enabled", () => {
    process.env.SMS_USAGE_INVOICING_ENABLED = "true";
    jest.useFakeTimers();
    const invoicing = { run: jest.fn().mockResolvedValue({}) };
    const worker = new SmsUsageInvoicingWorkerService(invoicing as never);
    worker.onModuleInit();
    jest.advanceTimersByTime(90_000);
    expect(invoicing.run).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(6 * 3_600_000);
    expect(invoicing.run).toHaveBeenCalledTimes(2);
    worker.onModuleDestroy();
    jest.advanceTimersByTime(24 * 3_600_000);
    expect(invoicing.run).toHaveBeenCalledTimes(2);
  });
});
