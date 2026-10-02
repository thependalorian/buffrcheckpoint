import { addDays, isoWeekdayIndex, localDateIn } from "../analytics-etl/local-date";

// Which scheduled reports are due right now, and for which period (migration
// 0046). Pure so the cadence rules can be unit-tested. All reports go out at
// or after 07:00 Africa/Windhoek; the run table makes each period send once.

export type ScheduledReportCode = "ops_daily_summary" | "site_manager_digest" | "board_compliance_monthly";

export interface DueReport {
  reportCode: ScheduledReportCode;
  periodKey: string;
  /** Inclusive local-date range the report covers. */
  from: string;
  to: string;
}

export const SEND_HOUR_LOCAL = 7;

function localHour(now: Date, timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now));
}

/** ISO-8601 week key, e.g. 2026-W40, for a yyyy-MM-dd date. */
export function isoWeekKey(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() - isoWeekdayIndex(isoDate) + 3);
  const year = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function dueReports(now: Date, timeZone = "Africa/Windhoek"): DueReport[] {
  if (localHour(now, timeZone) < SEND_HOUR_LOCAL) return [];
  const today = localDateIn(now, timeZone);
  const yesterday = addDays(today, -1);
  const due: DueReport[] = [{ reportCode: "ops_daily_summary", periodKey: today, from: yesterday, to: yesterday }];

  if (isoWeekdayIndex(today) === 0) {
    // Monday: the previous Monday to Sunday.
    due.push({
      reportCode: "site_manager_digest",
      periodKey: isoWeekKey(addDays(today, -7)),
      from: addDays(today, -7),
      to: yesterday,
    });
  }
  if (today.endsWith("-01")) {
    const lastMonthEnd = yesterday;
    const lastMonthStart = `${lastMonthEnd.slice(0, 7)}-01`;
    due.push({
      reportCode: "board_compliance_monthly",
      periodKey: lastMonthEnd.slice(0, 7),
      from: lastMonthStart,
      to: lastMonthEnd,
    });
  }
  return due;
}
