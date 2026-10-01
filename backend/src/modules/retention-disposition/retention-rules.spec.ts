import { effectivePolicies, holdCoversVisit, isExpired, retentionDaysFor } from "./retention-rules";

const DAY = 24 * 60 * 60 * 1000;

describe("effectivePolicies / retentionDaysFor", () => {
  const policies = effectivePolicies([
    { siteId: null, retentionDays: 365, version: 1 },
    { siteId: null, retentionDays: 180, version: 2 },
    { siteId: "site-a", retentionDays: 30, version: 1 },
    { siteId: "site-a", retentionDays: 90, version: 3 },
    { siteId: "site-a", retentionDays: 60, version: 2 },
  ]);

  it("uses the highest version per scope", () => {
    expect(policies.organisationDefaultDays).toBe(180);
    expect(retentionDaysFor("site-a", policies)).toBe(90);
  });

  it("falls back to the organisation default for sites without their own policy", () => {
    expect(retentionDaysFor("site-b", policies)).toBe(180);
  });

  it("returns null when there is no policy at all", () => {
    expect(retentionDaysFor("site-a", effectivePolicies([]))).toBeNull();
  });
});

describe("isExpired", () => {
  const now = new Date("2026-10-01T12:00:00Z");

  it("expires only strictly past the retention period", () => {
    expect(isExpired(new Date(now.getTime() - 31 * DAY), 30, now)).toBe(true);
    expect(isExpired(new Date(now.getTime() - 30 * DAY), 30, now)).toBe(false);
    expect(isExpired(new Date(now.getTime() - 29 * DAY), 30, now)).toBe(false);
  });
});

describe("holdCoversVisit", () => {
  const visit = {
    id: "visit-1",
    siteId: "site-a",
    visitorId: "subject-1",
    checkedInAt: new Date("2026-03-15T09:00:00Z"),
  };

  it("an empty scope holds the whole organisation", () => {
    expect(holdCoversVisit({}, visit)).toBe(true);
  });

  it("matches on site, visit and visitor", () => {
    expect(holdCoversVisit({ siteId: "site-a" }, visit)).toBe(true);
    expect(holdCoversVisit({ siteId: "site-b" }, visit)).toBe(false);
    expect(holdCoversVisit({ visitId: "visit-2" }, visit)).toBe(false);
    expect(holdCoversVisit({ visitorId: "subject-1" }, visit)).toBe(true);
  });

  it("requires every present criterion to match", () => {
    expect(holdCoversVisit({ siteId: "site-a", visitorId: "subject-2" }, visit)).toBe(false);
  });

  it("treats a date-only end as the whole day and a timestamp end as inclusive", () => {
    expect(holdCoversVisit({ dateRangeStart: "2026-03-01", dateRangeEnd: "2026-03-15" }, visit)).toBe(true);
    expect(holdCoversVisit({ dateRangeStart: "2026-03-01", dateRangeEnd: "2026-03-14" }, visit)).toBe(false);
    expect(holdCoversVisit({ dateRangeEnd: "2026-03-15T09:00:00Z" }, visit)).toBe(true);
    expect(holdCoversVisit({ dateRangeStart: "2026-03-16" }, visit)).toBe(false);
  });

  it("fails closed on anything it cannot interpret", () => {
    expect(holdCoversVisit({ siteId: "site-b", caseNumber: "HC-12" }, visit)).toBe(true);
    expect(holdCoversVisit({ siteId: "site-b", dateRangeStart: "not a date" }, visit)).toBe(true);
    expect(holdCoversVisit({ siteId: "site-b", dateRangeEnd: 20260315 }, visit)).toBe(true);
  });
});
