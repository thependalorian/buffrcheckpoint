import { CreateSiteSheet } from "./_components/create-site-sheet";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

interface SiteRow {
  id: string;
  name: string;
  regionId: string | null;
  timezone: string;
  deletedAt: string | null;
}

export default async function SitesPage() {
  let sites: SiteRow[] = [];
  let error: string | null = null;
  try {
    sites = await api.get<SiteRow[]>("/sites");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load sites.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Sites & Zones"
        description="Organisation, region, site, and zone structure."
        action={<CreateSiteSheet />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Name</TableHead>
                <TableHead className="h-11 p-3 font-medium">Timezone</TableHead>
                <TableHead className="h-11 p-3 font-medium">Site ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.length === 0 ? (
                <TableEmptyRow
                  colSpan={3}
                  title="No sites configured yet"
                  description="Every visitor record, device, and policy is scoped to a site. Add your first site to start recording check-ins."
                />
              ) : (
                sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="p-3 font-medium">{site.name}</TableCell>
                    <TableCell className="p-3">{site.timezone}</TableCell>
                    <TableCell className="p-3 font-mono text-xs">{site.id}</TableCell>
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
