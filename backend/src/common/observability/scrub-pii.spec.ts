import { scrubPiiFromSentryEvent } from "./scrub-pii";

describe("scrubPiiFromSentryEvent", () => {
  it("redacts visitor PII keys", () => {
    const scrubbed = scrubPiiFromSentryEvent({
      extra: { phone: "+264811234567", channel: "qr" },
      request: { data: { notes: "secret", siteId: "s1" }, query_string: "phone=1" },
    });
    expect(scrubbed.extra).toEqual({ phone: "[redacted]", channel: "qr" });
    expect((scrubbed.request as { data: Record<string, string> }).data.notes).toBe("[redacted]");
    expect((scrubbed.request as { query_string: string }).query_string).toBe("[redacted]");
  });
});
