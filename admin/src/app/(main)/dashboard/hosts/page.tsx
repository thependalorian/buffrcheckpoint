import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, EmptyActionLink, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

import { CreateHostSheet } from "./_components/create-host-sheet";
import { PersonalDataProtectionNote } from "./_components/protection-note";

interface SiteRow {
  id: string;
  name: string;
}

interface HostRow {
  id: string;
  siteId: string;
  displayName: string;
  department: string | null;
  active: boolean;
  hasContact: boolean;
}

export default async function HostsPage() {
  let sites: SiteRow[] = [];
  let hosts: HostRow[] = [];
  let units: Array<{ id: string; name: string; code: string }> = [];
  let error: string | null = null;

  try {
    sites = await api.get<SiteRow[]>("/sites");
    hosts = await api.get<HostRow[]>("/hosts");
    try {
      const directory = await api.get<{ flat: Array<{ id: string; name: string; code: string }> }>(
        "/organisation-directory",
      );
      units = directory.flat ?? [];
    } catch {
      units = [];
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load hosts.";
  }

  const siteNameById = new Map(sites.map((site) => [site.id, site.name]));

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Hosts & Departments"
        description="People visitors can select at check-in. Link hosts to directory units when your organisation tree is populated (custom or BIAN)."
        action={<CreateHostSheet sites={sites} units={units} />}
      />
      <PersonalDataProtectionNote />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Name</TableHead>
                <TableHead className="h-11 p-3 font-medium">Site</TableHead>
                <TableHead className="h-11 p-3 font-medium">Department</TableHead>
                <TableHead className="h-11 p-3 font-medium">Notify</TableHead>
                <TableHead className="h-11 p-3 font-medium">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hosts.length === 0 ? (
                <TableEmptyRow
                  colSpan={5}
                  title={sites.length === 0 ? "Create a site first" : "No hosts yet"}
                  action={
                    sites.length === 0 ? (
                      <EmptyActionLink href="/dashboard/sites">Go to Sites</EmptyActionLink>
                    ) : undefined
                  }
                  description={
                    sites.length === 0
                      ? "Add a site under Sites & Zones, then return here to add hosts."
                      : "Add a host so phone QR check-in and kiosk flows can notify someone."
                  }
                />
              ) : (
                hosts.map((host) => (
                  <TableRow key={host.id}>
                    <TableCell className="p-3 font-medium">{host.displayName}</TableCell>
                    <TableCell className="p-3">{siteNameById.get(host.siteId) ?? host.siteId}</TableCell>
                    <TableCell className="p-3">{host.department ?? "—"}</TableCell>
                    <TableCell className="p-3">{host.hasContact ? "Configured" : "Missing"}</TableCell>
                    <TableCell className="p-3">{host.active ? "Active" : "Inactive"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
