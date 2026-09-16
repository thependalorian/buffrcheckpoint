import { scrubPiiFromSentryEvent } from "./scrub-pii";

import { describe, expect, it } from "vitest";

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
});
