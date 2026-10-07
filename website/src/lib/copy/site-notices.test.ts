import { describe, expect, it } from "vitest";

import { formatNoticeDate, siteNoticesCopy } from "./site-notices";

describe("site notices copy", () => {
  it("formats dates in Windhoek and tolerates missing or bad values", () => {
    expect(formatNoticeDate("2026-10-07T22:30:00Z")).toBe("8 Oct 2026"); // already the next day in Windhoek (UTC+2)
    expect(formatNoticeDate(null)).toBe("");
    expect(formatNoticeDate("not a date")).toBe("");
  });

  it("builds the version line and has no emoji or placeholder text", () => {
    expect(siteNoticesCopy.emergency.updated(2, "7 Oct 2026")).toBe("Version 2, updated 7 Oct 2026");
    const all = JSON.stringify(siteNoticesCopy);
    expect(all).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(all).not.toMatch(/TODO|lorem/i);
  });
});
