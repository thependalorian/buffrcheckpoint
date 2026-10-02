import { describe, expect, it } from "vitest";

import { scrubPiiFromSentryEvent } from "./scrub-pii";

// A deliberately leaky event: a fake organisation name, invoice amount, KYB
// reference and support session id in every place Sentry carries data.
const FAKE_ORG = "Zebra Lodge Holdings";
const FAKE_AMOUNT = "48250.75";
const FAKE_KYB = "KYB-REF-778899";
const FAKE_SESSION = "sess-4f2a91";

describe("ops scrubPiiFromSentryEvent", () => {
  it("removes tenant-confidential values from the whole payload", () => {
    const scrubbed = scrubPiiFromSentryEvent({
      message: "Billing panel failed",
      extra: { organisation_name: FAKE_ORG, amount: FAKE_AMOUNT, page: "billing" },
      contexts: { tenant: { legal_name: FAKE_ORG, kyb_reference: FAKE_KYB } },
      tags: { support_session_id: FAKE_SESSION, route: "/billing" },
      request: { data: { invoice_number: "INV-2026-0042", amount: FAKE_AMOUNT, format: "csv" } },
      breadcrumbs: [{ category: "fetch", data: { trading_name: FAKE_ORG, mrr: 12000, status: 500 } }],
    });
    const payload = JSON.stringify(scrubbed);

    for (const secret of [FAKE_ORG, FAKE_AMOUNT, FAKE_KYB, FAKE_SESSION, "INV-2026-0042", "12000"]) {
      expect(payload).not.toContain(secret);
    }
    // Non-sensitive context survives, so events stay useful.
    for (const kept of ["billing", "/billing", "csv", "500", "Billing panel failed"]) {
      expect(payload).toContain(kept);
    }
  });

  it("still redacts visitor PII keys", () => {
    const scrubbed = scrubPiiFromSentryEvent({ extra: { phone: "+264811234567", channel: "kiosk" } });
    expect(scrubbed.extra).toEqual({ phone: "[redacted]", channel: "kiosk" });
  });
});
