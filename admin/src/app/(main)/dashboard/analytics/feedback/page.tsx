import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { feedbackCopy as copy, sharePercent } from "@/lib/copy/feedback";
import { listSiteOptions } from "@/lib/sites/site-options";

interface Detail {
  period: { from: string; to: string };
  responses: number;
  averageRating: number | null;
  distribution: Record<string, number>;
  bySite: Array<{ siteId: string; siteName: string; responses: number; averageRating: number | null }>;
  recentComments?: Array<{ id: string; siteName: string; submittedAt: string; rating: number; comment: string }>;
  commentsIncluded?: boolean;
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; days?: string }>;
}) {
  const query = await searchParams;
  const days = copy.periods[query.days ?? ""] ? Number(query.days) : 28;
  const siteId = query.site && /^[0-9a-f-]{36}$/i.test(query.site) ? query.site : "";
  const params = new URLSearchParams({ from: isoDaysAgo(days), to: isoDaysAgo(0) });
  if (siteId) params.set("siteId", siteId);

  const sites = await listSiteOptions();
  let detail: Detail | null = null;
  let commentsAllowed = true;
  let error: string | null = null;
  try {
    // The comments endpoint needs a stricter permission. Try it first; fall back to the figures-only view when it is refused.
    try {
      detail = await api.get<Detail>(`/analytics/satisfaction/comments?${params}`);
    } catch (err) {
      if (!(err instanceof Error) || !/API error 403/.test(err.message)) throw err;
      commentsAllowed = false;
      detail = await api.get<Detail>(`/analytics/satisfaction/detail?${params}`);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load feedback.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader title={copy.title} description={copy.description} />
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="fb-site" className="text-sm font-medium">
            {copy.filterSite}
          </label>
          <select
            id="fb-site"
            name="site"
            defaultValue={siteId}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">{copy.allSites}</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="fb-days" className="text-sm font-medium">
            {copy.filterPeriod}
          </label>
          <select
            id="fb-days"
            name="days"
            defaultValue={String(days)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            {Object.entries(copy.periods).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-8 rounded-lg border px-3 text-sm">
          {copy.apply}
        </button>
      </form>
      {error || !detail ? (
        <DashboardErrorState message={error ?? "Failed to load feedback."} />
      ) : detail.responses === 0 ? (
        <p className="rounded-lg border border-border p-4 text-muted-foreground text-sm">{copy.noResponses}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="text-muted-foreground text-sm">{copy.average}</p>
              <p className="font-semibold text-4xl tracking-tight">
                {detail.averageRating?.toFixed(2)}{" "}
                <span className="font-normal text-base text-muted-foreground">{copy.outOf}</span>
              </p>
              <p className="text-muted-foreground text-xs">{copy.period(detail.period.from, detail.period.to)}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-muted-foreground text-sm">{copy.responses}</p>
              <p className="font-semibold text-4xl tracking-tight">{detail.responses}</p>
            </div>
          </div>
          <section className="space-y-2" aria-labelledby="fb-dist">
            <h2 id="fb-dist" className="font-medium">
              {copy.distribution}
            </h2>
            <ul className="space-y-2">
              {[5, 4, 3, 2, 1].map((score) => {
                const count = detail?.distribution[String(score)] ?? 0;
                const share = sharePercent(count, detail?.responses ?? 0);
                return (
                  <li key={score} className="flex items-center gap-3 text-sm">
                    <span className="w-16 shrink-0">{copy.stars(score)}</span>
                    <div
                      className="h-3 flex-1 overflow-hidden rounded bg-muted"
                      role="img"
                      aria-label={`${copy.stars(score)}: ${count} of ${detail?.responses}`}
                    >
                      <div className="h-full bg-primary" style={{ width: `${share}%` }} />
                    </div>
                    <span className="w-20 shrink-0 text-right tabular-nums">
                      {count} ({share}%)
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="font-medium">{copy.bySite}</h2>
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{copy.columns.site}</TableHead>
                    <TableHead className="text-right">{copy.columns.responses}</TableHead>
                    <TableHead className="text-right">{copy.columns.average}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.bySite.length === 0 ? (
                    <TableEmptyRow colSpan={3} title={copy.noResponses} description="" />
                  ) : (
                    detail.bySite.map((row) => (
                      <TableRow key={row.siteId}>
                        <TableCell>{row.siteName}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.responses}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.averageRating?.toFixed(2) ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
          <section className="space-y-2">
            <h2 className="font-medium">{copy.comments}</h2>
            {!commentsAllowed ? (
              <p className="text-muted-foreground text-sm">{copy.commentsHidden}</p>
            ) : (detail.recentComments ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">{copy.noComments}</p>
            ) : (
              <ul className="space-y-3">
                {(detail.recentComments ?? []).map((row) => (
                  <li key={row.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="text-muted-foreground text-xs">
                      {copy.stars(row.rating)} at {row.siteName},{" "}
                      {new Date(row.submittedAt).toLocaleDateString("en-GB")}
                    </p>
                    <p className="whitespace-pre-line">{row.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
