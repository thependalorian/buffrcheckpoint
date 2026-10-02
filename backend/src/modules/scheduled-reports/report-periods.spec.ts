import { dueReports, isoWeekKey } from "./report-periods";

describe("scheduled report periods", () => {
  it("nothing is due before 07:00 Windhoek", () => {
    // 04:59 UTC is 06:59 in Windhoek.
    expect(dueReports(new Date("2026-10-05T04:59:00Z"))).toEqual([]);
  });

  it("a normal weekday sends only the ops summary for yesterday", () => {
    const due = dueReports(new Date("2026-10-07T05:00:00Z"));
    expect(due).toEqual([
      { reportCode: "ops_daily_summary", periodKey: "2026-10-07", from: "2026-10-06", to: "2026-10-06" },
    ]);
  });

  it("Monday adds the weekly digest for the previous Monday to Sunday", () => {
    const due = dueReports(new Date("2026-10-05T06:00:00Z"));
    expect(due.find((d) => d.reportCode === "site_manager_digest")).toEqual({
      reportCode: "site_manager_digest",
      periodKey: "2026-W40",
      from: "2026-09-28",
      to: "2026-10-04",
    });
  });

  it("the 1st adds the monthly pack for the previous month", () => {
    const due = dueReports(new Date("2026-10-01T06:00:00Z"));
    expect(due.find((d) => d.reportCode === "board_compliance_monthly")).toEqual({
      reportCode: "board_compliance_monthly",
      periodKey: "2026-09",
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("ISO week keys across a year boundary", () => {
    expect(isoWeekKey("2026-01-01")).toBe("2026-W01");
    expect(isoWeekKey("2027-01-01")).toBe("2026-W53");
  });
});
