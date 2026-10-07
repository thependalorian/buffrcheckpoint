import { describe, expect, it } from "vitest";

import { feedbackCopy, sharePercent } from "./feedback";
import { emailAudience, emailName, notificationPrefsCopy } from "./notifications";
import { ISSUABLE_QR_TYPES, siteNoticesAdminCopy } from "./site-notices";

describe("feedback copy", () => {
  it("works out shares without dividing by zero", () => {
    expect(sharePercent(3, 4)).toBe(75);
    expect(sharePercent(1, 3)).toBe(33);
    expect(sharePercent(0, 0)).toBe(0);
    expect(feedbackCopy.stars(1)).toBe("1 star");
    expect(feedbackCopy.stars(4)).toBe("4 stars");
  });
});

describe("notification preferences copy", () => {
  it("names every optional visitor email and falls back to a readable name", () => {
    for (const code of ["visitor_prereg_invite", "visitor_visit_receipt", "visitor_signout_thanks"]) {
      expect(notificationPrefsCopy.names[code]).toBeTruthy();
    }
    expect(emailName("some_new_email")).toBe("some new email");
    expect(emailAudience("visitor")).toContain("visitor");
  });
});

describe("site notices copy", () => {
  it("offers exactly the three QR types the backend can issue", () => {
    expect(ISSUABLE_QR_TYPES.map((t) => t.value)).toEqual([
      "public_site_checkin",
      "emergency_info",
      "contractor_induction",
    ]);
  });

  it("states the published version in plain words and has no emoji", () => {
    expect(siteNoticesAdminCopy.published(2, true, "7 Oct 2026")).toBe(
      "Published version 2 for this site, 7 Oct 2026.",
    );
    expect(siteNoticesAdminCopy.published(1, false, "7 Oct 2026")).toContain("for all sites");
    const all = JSON.stringify([siteNoticesAdminCopy, feedbackCopy, notificationPrefsCopy]);
    expect(all).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
