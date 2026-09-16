import { CreateInvitationSheet } from "@/app/(main)/dashboard/schedule/_components/create-invitation-sheet";
import { InvitationList } from "@/app/(main)/dashboard/schedule/_components/invitation-list";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

interface CheckpointScheduleEvent {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  typeCode: string;
  siteId: string;
}

interface SiteRow {
  id: string;
  name: string;
}

interface HostRow {
  id: string;
  siteId: string;
  displayName: string;
}

interface InvitationRow {
  id: string;
  siteId: string;
  hostId: string;
  visitorReference: string;
  expectedFrom: string | null;
  expectedUntil: string | null;
  statusCode: string;
  revokedAt: string | null;
}

export default async function SchedulePage() {
  let events: CheckpointScheduleEvent[] = [];
  let sites: SiteRow[] = [];
  let hosts: HostRow[] = [];
  let invitations: InvitationRow[] = [];
  let error: string | null = null;

  try {
    [events, sites, hosts, invitations] = await Promise.all([
      api.get<CheckpointScheduleEvent[]>("/schedule"),
      api.get<SiteRow[]>("/sites"),
      api.get<HostRow[]>("/hosts"),
      api.get<InvitationRow[]>("/invitations"),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load the schedule.";
  }

  const siteNameById = Object.fromEntries(sites.map((site) => [site.id, site.name]));

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Schedule"
        description="Invitations, expected visitors, contractor schedules, and credential expiry."
        action={<CreateInvitationSheet sites={sites} hosts={hosts} />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <>
          <InvitationList invitations={invitations} siteNameById={siteNameById} />
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader className="bg-muted/15">
                <TableRow>
                  <TableHead className="h-11 p-3 font-medium">Event</TableHead>
                  <TableHead className="h-11 p-3 font-medium">Expected from</TableHead>
                  <TableHead className="h-11 p-3 font-medium">Expected until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableEmptyRow
                    colSpan={3}
                    title="Nothing scheduled yet"
                    description="Release 1 shows pre-registered visitor arrivals here. Invite a visitor to see them appear in date order."
                  />
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="p-3 font-medium">{event.title}</TableCell>
                      <TableCell className="p-3">
                        {event.startsAt ? new Date(event.startsAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="p-3">
                        {event.endsAt ? new Date(event.endsAt).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
