import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { VisitRosterRow } from "./recent-customers-table/schema";
import { VisitRosterTable } from "./recent-customers-table/table";

export function SubscriberOverview({ visits }: { visits: VisitRosterRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-none">On-site Roster</CardTitle>
        <CardDescription>
          Live visitor records within authorised scope. Phone numbers, national IDs, and notes are excluded from this
          view.
        </CardDescription>
        <CardAction />
      </CardHeader>
      <CardContent>
        <VisitRosterTable data={visits} />
      </CardContent>
    </Card>
  );
}
