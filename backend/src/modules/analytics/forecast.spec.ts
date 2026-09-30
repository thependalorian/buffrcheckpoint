import { addDays, dateRange, isoWeekdayIndex, localDateIn } from "../analytics-etl/local-date";
import { type DailyCount, forecastDaily, MIN_HISTORY_DAYS } from "./forecast";
import { suppress } from "./suppression";

function weeklySeries(days: number, start = "2026-06-01"): DailyCount[] {
  // Monday-heavy weekly pattern: Mon 20, Tue-Fri 10, Sat 5, Sun 2.
  const pattern = [20, 10, 10, 10, 10, 5, 2];
  return dateRange(start, addDays(start, days - 1)).map((date) => ({ date, count: pattern[isoWeekdayIndex(date)] }));
}

describe("local-date", () => {
  it("counts a 01:00 Windhoek check-in on the Windhoek day, not the previous UTC day", () => {
    // 23:00 UTC on 29 Sep is 01:00 on 30 Sep in Windhoek (UTC+2).
    expect(localDateIn(new Date("2026-09-29T23:00:00Z"), "Africa/Windhoek")).toBe("2026-09-30");
    expect(localDateIn(new Date("2026-09-29T23:00:00Z"), "UTC")).toBe("2026-09-29");
  });

  it("builds inclusive ranges and ISO weekdays", () => {
    expect(dateRange("2026-09-28", "2026-10-02")).toHaveLength(5);
    expect(isoWeekdayIndex("2026-09-28")).toBe(0); // Monday
    expect(isoWeekdayIndex("2026-10-04")).toBe(6); // Sunday
  });
});

describe("forecastDaily", () => {
  it("refuses to forecast below the minimum history", () => {
    const result = forecastDaily(weeklySeries(MIN_HISTORY_DAYS - 1), 14);
    expect(result).toEqual({ status: "insufficient_history", daysAvailable: 27, daysRequired: 28 });
  });

  it("reproduces a clean weekly pattern and beats nothing it cannot beat", () => {
    const history = weeklySeries(70);
    const result = forecastDaily(history, 7);
    if (result.status !== "ok") throw new Error("expected a forecast");
    expect(result.forecast).toHaveLength(7);
    const byWeekday = new Map(result.forecast.map((p) => [isoWeekdayIndex(p.date), p.forecast]));
    expect(byWeekday.get(0)).toBe(20);
    expect(byWeekday.get(6)).toBe(2);
    // A perfectly periodic series: seasonal-naive is also perfect, so MASE is undefined, not a flattering 0.
    expect(result.mase).toBeNull();
    for (const p of result.forecast) expect(p.lower).toBeLessThanOrEqual(p.forecast);
  });

  it("reports MASE against the seasonal-naive baseline on noisy data", () => {
    const history = weeklySeries(84).map((p, i) => ({ ...p, count: p.count + (i % 3 === 0 ? 4 : -2) }));
    const result = forecastDaily(history, 14);
    if (result.status !== "ok") throw new Error("expected a forecast");
    expect(result.backtestDays).toBe(28);
    expect(result.mase).not.toBeNull();
    expect(result.mase).toBeGreaterThan(0);
    for (const p of result.forecast) expect(p.lower).toBeGreaterThanOrEqual(0);
  });
});

describe("suppress", () => {
  it("withholds small cells as null, never 0", () => {
    expect(suppress(3, 5)).toEqual({ value: null, suppressed: true });
    expect(suppress(5, 5)).toEqual({ value: 5, suppressed: false });
    expect(suppress(0, 5)).toEqual({ value: 0, suppressed: false });
  });
});
