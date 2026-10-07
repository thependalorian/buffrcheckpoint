import { DEFAULT_SMS_LIMIT_PER_MONTH, SmsEntitlementService } from "./sms-entitlement.service";
import { parseBillingMonth } from "./sms-usage-billing";

/** A db whose execute() answers queries by a fragment of their SQL text or parameters, first matching rule wins. */
function dbWith(rules: Array<{ match: string; rows: unknown[] }>) {
  const execute = jest.fn(async (query: { queryChunks?: unknown[] }) => {
    const text = JSON.stringify(query.queryChunks ?? query);
    const rule = rules.find((r) => text.includes(r.match));
    return { rows: rule?.rows ?? [] };
  });
  return { db: { execute } as never, execute };
}

const ADDON = { match: "organisation_subscription_addon", rows: [{ "?column?": 1 }] };

describe("SmsEntitlementService", () => {
  it("denies an organisation without the add-on and counts nothing", async () => {
    const { db } = dbWith([{ match: "organisation_subscription_addon", rows: [] }]);
    await expect(new SmsEntitlementService(db).check("org-1")).resolves.toEqual({
      allowed: false,
      reason: "addon_not_active",
      used: 0,
      limit: 0,
    });
  });

  it("allows an add-on organisation under the default safety limit", async () => {
    const { db } = dbWith([ADDON, { match: "sms_contact_confirmation_events", rows: [{ sent: 12 }] }]);
    await expect(new SmsEntitlementService(db).check("org-1")).resolves.toEqual({
      allowed: true,
      reason: null,
      used: 12,
      limit: DEFAULT_SMS_LIMIT_PER_MONTH,
    });
  });

  it("stops at the safety limit", async () => {
    const { db } = dbWith([
      ADDON,
      { match: "sms_contact_confirmation_events", rows: [{ sent: DEFAULT_SMS_LIMIT_PER_MONTH }] },
    ]);
    expect(await new SmsEntitlementService(db).check("org-1")).toMatchObject({
      allowed: false,
      reason: "monthly_limit_reached",
      used: DEFAULT_SMS_LIMIT_PER_MONTH,
    });
  });

  it("lets an organisation limit beat the platform default, and ignores a malformed value", async () => {
    const own = dbWith([{ match: "sms_limit:org-1", rows: [{ setting_value: { perMonth: 5000 } }] }]);
    await expect(new SmsEntitlementService(own.db).limitFor("org-1")).resolves.toBe(5000);
    const platform = dbWith([{ match: "sms_limit:default", rows: [{ setting_value: { perMonth: 50 } }] }]);
    await expect(new SmsEntitlementService(platform.db).limitFor("org-1")).resolves.toBe(50);
    const junk = dbWith([{ match: "sms_limit:default", rows: [{ setting_value: { perMonth: "lots" } }] }]);
    await expect(new SmsEntitlementService(junk.db).limitFor("org-1")).resolves.toBe(DEFAULT_SMS_LIMIT_PER_MONTH);
  });

  it("prices a text at N$1.00 unless a valid override says otherwise", async () => {
    await expect(new SmsEntitlementService(dbWith([]).db).unitPriceFor("org-1")).resolves.toBe("1.00");
    const own = dbWith([{ match: "sms_unit_price:org-1", rows: [{ setting_value: { amount: "0.80" } }] }]);
    await expect(new SmsEntitlementService(own.db).unitPriceFor("org-1")).resolves.toBe("0.80");
    const platform = dbWith([{ match: "sms_unit_price:default", rows: [{ setting_value: { amount: "1.20" } }] }]);
    await expect(new SmsEntitlementService(platform.db).unitPriceFor("org-1")).resolves.toBe("1.20");
    const junk = dbWith([{ match: "sms_unit_price:default", rows: [{ setting_value: { amount: "cheap" } }] }]);
    await expect(new SmsEntitlementService(junk.db).unitPriceFor("org-1")).resolves.toBe("1.00");
  });

  it("summarises a month: sent, unit price and limit", async () => {
    const { db, execute } = dbWith([{ match: "sms_contact_confirmation_events", rows: [{ sent: 7 }] }]);
    const october = parseBillingMonth("2026-10");
    if (!october) throw new Error("month");
    await expect(new SmsEntitlementService(db).usageFor("org-1", october)).resolves.toEqual({
      month: "2026-10",
      sent: 7,
      unitPrice: "1.00",
      limit: DEFAULT_SMS_LIMIT_PER_MONTH,
    });
    // The count is bounded by the Windhoek month, in UTC instants.
    const params = JSON.stringify(execute.mock.calls.map((c) => c[0]));
    expect(params).toContain("2026-09-30T22:00:00.000Z");
    expect(params).toContain("2026-10-31T22:00:00.000Z");
  });
});
