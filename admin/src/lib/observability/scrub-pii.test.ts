import { describe, expect, it } from "vitest";

import { scrubPiiFromSentryEvent } from "./scrub-pii";

describe("scrubPiiFromSentryEvent", () => {
  it("redacts visitor PII keys from extra and request data", () => {
    const scrubbed = scrubPiiFromSentryEvent({
      message: "boom",
      extra: { phone: "+264811234567", channel: "kiosk" },
      request: { data: { notes: "visitor note", siteId: "site-1" } },
    });

    expect(scrubbed.extra).toEqual({ phone: "[redacted]", channel: "kiosk" });
    expect(scrubbed.request).toEqual({ data: { notes: "[redacted]", siteId: "site-1" } });
  });

  it("redacts PII in contexts, tags and breadcrumb data", () => {
    const scrubbed = scrubPiiFromSentryEvent({
      contexts: { visitor: { full_name: "Jane Doe", site: "HQ" } },
      tags: { email: "jane@example.com", release: "1.0" },
      breadcrumbs: [{ category: "fetch", data: { visitor_name: "Jane Doe", status: 200 } }],
    });
    const payload = JSON.stringify(scrubbed);
    expect(payload).not.toContain("Jane Doe");
    expect(payload).not.toContain("jane@example.com");
    expect(payload).toContain("HQ");
    expect(payload).toContain("1.0");
  });
});
