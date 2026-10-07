import { deliverableEmail, formatDuration, formatWhen, visitReference } from "./visitor-email";

describe("visitor email helpers", () => {
  it("accepts one plain address and lower-cases it", () => {
    expect(deliverableEmail("  Maria@Example.COM ")).toBe("maria@example.com");
  });

  it("refuses anything that could add a recipient or a header", () => {
    for (const bad of [
      "a@b",
      "maria",
      "a@b.com, c@d.com",
      "a@b.com\r\nBcc: x@y.com",
      "Maria <a@b.com>",
      "a b@c.com",
      "",
      null,
      undefined,
      "a@b.c",
    ]) {
      expect(deliverableEmail(bad as string)).toBeNull();
    }
  });

  it("shows time in Windhoek", () => {
    expect(formatWhen(new Date("2026-10-07T07:15:00Z"))).toContain("09:15");
    expect(formatWhen(null)).toBe("Not set");
  });

  it("formats time on site", () => {
    const start = new Date("2026-10-07T07:00:00Z");
    expect(formatDuration(start, new Date("2026-10-07T07:20:00Z"))).toBe("20 min");
    expect(formatDuration(start, new Date("2026-10-07T08:05:00Z"))).toBe("1 h 05 min");
    expect(formatDuration(start, new Date("2026-10-07T07:00:20Z"))).toBe("under a minute");
  });

  it("makes a short quotable reference", () => {
    expect(visitReference("3f2a9c1e-1111-4222-8333-444455556666")).toBe("3F2A9C1E");
  });
});
