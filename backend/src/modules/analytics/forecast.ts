import { addDays, isoWeekdayIndex } from "../analytics-etl/local-date";

export interface DailyCount {
  date: string; // yyyy-MM-dd, contiguous, zero-filled
  count: number;
}

export interface ForecastPoint {
  date: string;
  forecast: number;
  lower: number;
  upper: number;
}

export type ForecastResult =
  | { status: "insufficient_history"; daysAvailable: number; daysRequired: number }
  | {
      status: "ok";
      method: "day_of_week_mean_8_weeks";
      forecast: ForecastPoint[];
      backtestDays: number;
      /** Mean absolute scaled error vs a seasonal-naive (same weekday last week) baseline. Below 1 beats the baseline. */
      mase: number | null;
    };

export const MIN_HISTORY_DAYS = 28;
const SEASON = 7;
const WEEKS = 8;

/** Mean of the same weekday over the last `WEEKS` weeks of `history`. */
function weekdayMeans(history: DailyCount[]): number[] {
  const window = history.slice(-SEASON * WEEKS);
  const sums = new Array<number>(SEASON).fill(0);
  const counts = new Array<number>(SEASON).fill(0);
  for (const point of window) {
    const weekday = isoWeekdayIndex(point.date);
    sums[weekday] += point.count;
    counts[weekday] += 1;
  }
  return sums.map((sum, i) => (counts[i] ? sum / counts[i] : 0));
}

/**
 * Day-of-week seasonal forecast with an honest backtest.
 *
 * Forecast = mean of the same weekday over the last 8 weeks. The band is
 * +/- 1.96 x the standard deviation of in-sample residuals (floored at 0).
 * MASE compares the method's error on the last 28 days (each predicted from
 * the data before it) with the seasonal-naive error (same weekday one week
 * earlier). Returns insufficient_history instead of a number below 28 days.
 */
export function forecastDaily(history: DailyCount[], horizon: number): ForecastResult {
  if (history.length < MIN_HISTORY_DAYS) {
    return { status: "insufficient_history", daysAvailable: history.length, daysRequired: MIN_HISTORY_DAYS };
  }

  const backtestDays = Math.min(28, history.length - SEASON * 2);
  let methodError = 0;
  let naiveError = 0;
  const residuals: number[] = [];
  for (let i = history.length - backtestDays; i < history.length; i++) {
    const prior = history.slice(0, i);
    const predicted = weekdayMeans(prior)[isoWeekdayIndex(history[i].date)];
    const actual = history[i].count;
    methodError += Math.abs(actual - predicted);
    naiveError += Math.abs(actual - history[i - SEASON].count);
    residuals.push(actual - predicted);
  }
  const mase = naiveError > 0 ? methodError / naiveError : null;

  const meanResidual = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const variance = residuals.reduce((a, r) => a + (r - meanResidual) ** 2, 0) / residuals.length;
  const spread = 1.96 * Math.sqrt(variance);

  const means = weekdayMeans(history);
  const last = history[history.length - 1].date;
  const forecast: ForecastPoint[] = [];
  for (let step = 1; step <= horizon; step++) {
    const date = addDays(last, step);
    const value = means[isoWeekdayIndex(date)];
    forecast.push({
      date,
      forecast: round1(value),
      lower: round1(Math.max(0, value - spread)),
      upper: round1(value + spread),
    });
  }

  return {
    status: "ok",
    method: "day_of_week_mean_8_weeks",
    forecast,
    backtestDays,
    mase: mase === null ? null : Math.round(mase * 100) / 100,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
