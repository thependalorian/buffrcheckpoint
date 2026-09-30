import Link from "next/link";

import type { VisitRosterRow } from "@/components/features/visits/visit-roster-table/schema";
import { VisitRosterTable } from "@/components/features/visits/visit-roster-table/table";
import { Button } from "@/components/ui/button";

const OVERVIEW_ROSTER_PREVIEW = 10;

export function OnSiteRosterPanel({ visits }: { visits: VisitRosterRow[] }) {
  const preview = visits.slice(0, OVERVIEW_ROSTER_PREVIEW);
  const hasMore = visits.length > OVERVIEW_ROSTER_PREVIEW;

  return (
    <div className="bc-panel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="font-heading text-base font-medium leading-none text-foreground">On-site Roster</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Live visitor records within authorised scope. Phone numbers, national IDs, and notes are excluded from this
            view.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link prefetch={false} href="/dashboard/front-desk">
            View full roster
          </Link>
        </Button>
      </div>
      <VisitRosterTable data={preview} />
      {hasMore ? (
        <p className="mt-3 text-muted-foreground text-sm">
          Showing {OVERVIEW_ROSTER_PREVIEW} of {visits.length} on-site visitors.{" "}
          <Link prefetch={false} href="/dashboard/front-desk" className="underline underline-offset-4">
            Open Front Desk
          </Link>{" "}
          for the full roster and ops actions.
        </p>
      ) : null}
    </div>
  );
}
