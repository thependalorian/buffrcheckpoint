import { hasAcceptedAnalyticsConsent, readAnalyticsConsent, writeAnalyticsConsent } from "./analytics-consent";

import { describe, expect, it } from "vitest";

describe("analytics consent storage", () => {
  it("reads and writes accepted/declined without other values", () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (key: string) => mem.get(key) ?? null,
      setItem: (key: string, value: string) => {
        mem.set(key, value);
      },
    };

    expect(readAnalyticsConsent(storage)).toBeNull();
    writeAnalyticsConsent("accepted", storage);
    expect(hasAcceptedAnalyticsConsent(storage)).toBe(true);
    writeAnalyticsConsent("declined", storage);
    expect(readAnalyticsConsent(storage)).toBe("declined");
  });
});
