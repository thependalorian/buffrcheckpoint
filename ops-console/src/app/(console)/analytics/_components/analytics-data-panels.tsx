import { ShareBars } from "@/components/charts/ShareBars";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { backfillAnalyticsAction } from "../actions";

export interface EtlRunRow {
  id: string;
  kind: string | null;
  status: string | null;
  windowFrom: string;
  windowTo: string;
  startedAt: string;
  finishedAt: string | null;
  sourceVisitCount: number | null;
  factVisitCount: number | null;
  errorMessage: string | null;
}

interface SuppressedValue {
  value: number | null;
  suppressed: boolean;
}

export interface ArrivalStatistics {
  from: string;
  to: string;
  minCell: number;
  cells: ({ region: string; visitorType: string } & SuppressedValue)[];
  regions: ({ region: string } & SuppressedValue)[];
}

function formatWhen(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Windhoek" }) : "Running";
}

/** ETL health: did the last rollup reconcile with the raw visits? A non-zero difference is the finding. */
export function EtlHealthPanel({ runs }: { runs: EtlRunRow[] }) {
  const last = runs[0];
  const difference =
    last && last.sourceVisitCount !== null && last.factVisitCount !== null
      ? last.sourceVisitCount - last.factVisitCount
      : null;
  let finding = "No analytics refresh has run yet.";
  if (last?.status === "succeeded") {
    finding = `Last refresh reconciled: ${last.sourceVisitCount} visits in, ${last.factVisitCount} counted, difference 0.`;
  } else if (last?.status === "failed") {
    finding = `Last refresh failed${difference === null ? "" : ` with a difference of ${difference}`}. Customer analytics may be stale.`;
  } else if (last) {
    finding = "A refresh is running now.";
  }

  return (
    <div className="bc-panel">
      <div className="bc-panel-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-heading font-medium text-lg leading-none">Analytics refresh (ETL)</p>
          <p className="mt-1 text-muted-foreground text-sm">{finding}</p>
        </div>
        <form action={backfillAnalyticsAction}>
          <Button type="submit" size="sm" variant="outline">
            Rebuild all history
          </Button>
        </form>
      </div>
      <div className="overflow-x-auto p-0!">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Started</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visits in / counted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.slice(0, 8).map((run) => (
              <TableRow key={run.id}>
                <TableCell className="text-muted-foreground">{formatWhen(run.startedAt)}</TableCell>
                <TableCell>{run.kind ?? "Unknown"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {run.windowFrom} to {run.windowTo}
                </TableCell>
                <TableCell className={run.status === "failed" ? "font-medium text-destructive" : undefined}>
                  {run.status ?? "Unknown"}
                </TableCell>
                <TableCell className="font-mono tabular-nums">
                  {run.sourceVisitCount ?? "n/a"} / {run.factVisitCount ?? "n/a"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="px-4 py-3 text-muted-foreground text-xs">
        Runs hourly. Each run recomputes recent days plus any day touched by a late offline sync, then checks that every
        visit is counted exactly once.
      </p>
    </div>
  );
}

/** Anonymised arrivals by Namibian region and visitor type — the Tourism Board feed. Small cells are withheld. */
export function ArrivalStatisticsPanel({ stats }: { stats: ArrivalStatistics }) {
  const shown = stats.regions.filter((r) => r.value !== null) as { region: string; value: number }[];
  const withheld = stats.cells.filter((c) => c.suppressed).length;
  const lead = [...shown].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="space-y-4">
      {shown.length > 0 ? (
        <ShareBars
          title="Arrivals by region (anonymised)"
          finding={
            lead
              ? `${lead.region} leads with ${lead.value} check-ins from ${stats.from} to ${stats.to}.`
              : "No region has enough arrivals to show yet."
          }
          data={shown.map((r) => ({ label: r.region, value: r.value }))}
          valueSuffix=" check-ins"
        />
      ) : null}
      <div className="bc-panel overflow-x-auto p-0!">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Region</TableHead>
              <TableHead>Visitor type</TableHead>
              <TableHead>Check-ins</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.cells.map((cell) => (
              <TableRow key={`${cell.region}-${cell.visitorType}`}>
                <TableCell>{cell.region}</TableCell>
                <TableCell>{cell.visitorType}</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {cell.suppressed ? `fewer than ${stats.minCell}` : cell.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="px-4 py-3 text-muted-foreground text-xs">
          Counts only, no property names. Cells under {stats.minCell} are withheld ({withheld} this period) so no
          property or guest can be singled out. Sites without a region are grouped as "Region not set".
        </p>
      </div>
    </div>
  );
}
