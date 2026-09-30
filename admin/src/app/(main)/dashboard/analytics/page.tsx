import { BcStatRow, BcStatTile } from "@/components/bc-panel";
import { BusyHoursHeatmap } from "@/components/charts/busy-hours-heatmap";
import { Figure } from "@/components/charts/figure";
import { ShareBars } from "@/components/charts/share-bars";
import { type TrendRow, TrendWithForecast } from "@/components/charts/trend-with-forecast";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { CHANNEL_LABELS, analyticsCopy as copy, WEEKDAYS } from "@/lib/copy/analytics";

interface Metric {
  value: number | null;
  previous: number | null;
  changePct: number | null;
}

interface Summary {
  refreshedAt: string | null;
  checkIns: Metric;
  avgMinutesOnSite: Metric;
  ownPhoneShare: Metric;
  offlineCaptures: Metric;
}

interface DailyCount {
  date: string;
  count: number;
}

interface MixResult {
  total: number;
  rows: { code: string | null; label: string; count: number; share: number | null }[];
}

interface BusyHours {
  total: number;
  matrix: number[][];
}

type Forecast =
  | { status: "insufficient_history"; daysAvailable: number; daysRequired: number; history: DailyCount[] }
  | {
      status: "ok";
      forecast: { date: string; forecast: number; lower: number; upper: number }[];
      mase: number | null;
      history: DailyCount[];
    };

const TIMEZONE = "Africa/Windhoek";

function localToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayIndex(isoDate: string): number {
  return (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function busiestWeekday(series: DailyCount[]): string | null {
  const totals = new Array<number>(7).fill(0);
  for (const point of series) totals[weekdayIndex(point.date)] += point.count;
  const max = Math.max(...totals);
  return max > 0 ? WEEKDAYS[totals.indexOf(max)] : null;
}

function changeLine(metric: Metric): string {
  return metric.changePct === null ? copy.kpis.noPrevious : copy.kpis.change(metric.changePct);
}

function busiestHour(matrix: number[][]): { day: number; hour: number; count: number } | null {
  let best: { day: number; hour: number; count: number } | null = null;
  for (const [day, row] of matrix.entries()) {
    for (const [hour, count] of row.entries()) {
      if (count > 0 && (!best || count > best.count)) best = { day, hour, count };
    }
  }
  return best;
}

function trendFinding(forecastTotal: number | null, periodTotal: number, daily: DailyCount[]): string {
  if (forecastTotal !== null) return copy.trend.forecastFinding(forecastTotal, 14);
  if (periodTotal > 0) return copy.trend.finding(periodTotal, busiestWeekday(daily));
  return copy.trend.empty;
}

function trendWhy(forecast: Forecast): string {
  if (forecast.status !== "ok") return copy.trend.insufficient(forecast.daysAvailable, forecast.daysRequired);
  return forecast.mase === null ? copy.trend.backtestNone : copy.trend.backtest(forecast.mase);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; siteId?: string }>;
}) {
  const params = await searchParams;
  const days = copy.filters.ranges.some((r) => r.value === params.days) ? Number(params.days) : 30;
  const siteId = params.siteId && /^[0-9a-f-]{36}$/i.test(params.siteId) ? params.siteId : "";
  const to = localToday();
  const from = addDays(to, -(days - 1));
  const query = `from=${from}&to=${to}${siteId ? `&siteId=${siteId}` : ""}`;

  let data: [Summary, DailyCount[], BusyHours, MixResult, MixResult, Forecast, { id: string; name: string }[]];
  try {
    data = await Promise.all([
      api.get<Summary>(`/analytics/summary?${query}`),
      api.get<DailyCount[]>(`/analytics/daily?${query}`),
      api.get<BusyHours>(`/analytics/busy-hours?${query}`),
      api.get<MixResult>(`/analytics/mix?dimension=channel&${query}`),
      api.get<MixResult>(`/analytics/mix?dimension=visitor_type&${query}`),
      api.get<Forecast>(`/analytics/forecast?horizon=14${siteId ? `&siteId=${siteId}` : ""}`),
      api.get<{ id: string; name: string }[]>("/sites"),
    ]);
  } catch (err) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <DashboardPageHeader title={copy.title} description={copy.description} />
        <DashboardErrorState message={err instanceof Error ? err.message : copy.error} />
      </div>
    );
  }
  const [summary, daily, busy, channels, visitorTypes, forecast, sites] = data;

  const periodTotal = daily.reduce((a, p) => a + p.count, 0);
  const forecastTotal =
    forecast.status === "ok" ? Math.round(forecast.forecast.reduce((a, p) => a + p.forecast, 0)) : null;

  const trendRows: TrendRow[] = [
    ...daily.map((p) => ({ date: p.date, actual: p.count })),
    ...(forecast.status === "ok"
      ? forecast.forecast
          .filter((p) => p.date > to)
          .map((p) => ({ date: p.date, forecast: p.forecast, range: [p.lower, p.upper] as [number, number] }))
      : []),
  ];

  const peak = busiestHour(busy.matrix);

  const channelRows = channels.rows.map((r) => ({ ...r, label: (r.code && CHANNEL_LABELS[r.code]) || r.label }));
  const refreshed = summary.refreshedAt
    ? copy.refreshed(
        new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, dateStyle: "medium", timeStyle: "short" }).format(
          new Date(summary.refreshedAt),
        ),
      )
    : copy.notRefreshed;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DashboardPageHeader
        title={copy.title}
        description={copy.description}
        action={
          <Button asChild variant="outline" size="sm">
            <a href={`/api/analytics/export?${query}`} title={copy.exportHint}>
              {copy.export}
            </a>
          </Button>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">{copy.filters.range}</span>
          <select
            name="days"
            defaultValue={String(days)}
            className="h-9 rounded-md border border-border bg-background px-2"
          >
            {copy.filters.ranges.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">{copy.filters.site}</span>
          <select
            name="siteId"
            defaultValue={siteId}
            className="h-9 rounded-md border border-border bg-background px-2"
          >
            <option value="">{copy.filters.allSites}</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm">
          {copy.filters.apply}
        </Button>
        <p className="ml-auto text-muted-foreground text-xs">{refreshed}</p>
      </form>

      <BcStatRow>
        <BcStatTile label={copy.kpis.checkIns} value={summary.checkIns.value ?? 0} />
        <BcStatTile
          label={copy.kpis.avgMinutes}
          value={
            summary.avgMinutesOnSite.value === null ? copy.kpis.none : copy.kpis.minutes(summary.avgMinutesOnSite.value)
          }
        />
        <BcStatTile
          label={copy.kpis.ownPhone}
          value={summary.ownPhoneShare.value === null ? copy.kpis.none : copy.kpis.percent(summary.ownPhoneShare.value)}
        />
        <BcStatTile label={copy.kpis.offline} value={summary.offlineCaptures.value ?? 0} />
      </BcStatRow>
      <p className="-mt-2 text-muted-foreground text-xs">
        {copy.kpis.checkIns}: {changeLine(summary.checkIns)}
      </p>

      <Figure
        question={copy.trend.question}
        finding={trendFinding(forecastTotal, periodTotal, daily)}
        why={trendWhy(forecast)}
        next={forecast.status === "ok" ? copy.trend.forecastNext : copy.trend.why}
        source={copy.trend.source}
      >
        {periodTotal > 0 || forecast.status === "ok" ? (
          <TrendWithForecast rows={trendRows} />
        ) : (
          <p className="py-10 text-center text-muted-foreground text-sm">{copy.trend.empty}</p>
        )}
      </Figure>

      <Figure
        question={copy.busyHours.question}
        finding={
          peak && busy.total > 0
            ? copy.busyHours.finding(WEEKDAYS[peak.day], peak.hour, Math.round((peak.count / busy.total) * 1000) / 10)
            : copy.busyHours.empty
        }
        why={copy.busyHours.why}
        next={busy.total > 0 ? copy.busyHours.next : undefined}
        source={copy.busyHours.source}
      >
        {busy.total > 0 ? (
          <BusyHoursHeatmap matrix={busy.matrix} />
        ) : (
          <p className="py-10 text-center text-muted-foreground text-sm">{copy.busyHours.empty}</p>
        )}
      </Figure>

      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
        <Figure
          question={copy.channels.question}
          finding={
            channelRows[0]?.share != null
              ? copy.channels.finding(channelRows[0].label, channelRows[0].share)
              : copy.channels.empty
          }
          why={copy.channels.why}
          next={channelRows.length > 0 ? copy.channels.next : undefined}
        >
          {channelRows.length > 0 ? (
            <ShareBars rows={channelRows} />
          ) : (
            <p className="py-10 text-center text-muted-foreground text-sm">{copy.channels.empty}</p>
          )}
        </Figure>
        <Figure
          question={copy.visitorTypes.question}
          finding={
            visitorTypes.rows[0]?.share != null
              ? copy.visitorTypes.finding(visitorTypes.rows[0].label, visitorTypes.rows[0].share)
              : copy.visitorTypes.empty
          }
          why={copy.visitorTypes.why}
          next={visitorTypes.rows.length > 0 ? copy.visitorTypes.next : undefined}
        >
          {visitorTypes.rows.length > 0 ? (
            <ShareBars rows={visitorTypes.rows} />
          ) : (
            <p className="py-10 text-center text-muted-foreground text-sm">{copy.visitorTypes.empty}</p>
          )}
        </Figure>
      </div>
    </div>
  );
}
