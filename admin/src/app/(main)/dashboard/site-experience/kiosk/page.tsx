import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, EmptyActionLink, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { listSiteOptions } from "@/lib/sites/site-options";

import { KioskSetupSheet } from "../_components/kiosk-actions";

interface KioskConfigRow {
  id: string;
  configName: string | null;
  siteId: string;
  deviceId: string | null;
}

export default async function KioskExperiencePage() {
  const sites = await listSiteOptions();
  let configs: KioskConfigRow[] = [];
  let error: string | null = null;
  try {
    configs = await api.get<KioskConfigRow[]>("/kiosk-experience");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load kiosk experience configurations.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Kiosk Experience"
        description="Idle timeout, maintenance mode, accessibility, and channel enablement per site or device."
        action={<KioskSetupSheet sites={sites} />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Configuration</TableHead>
                <TableHead className="h-11 p-3 font-medium">Site ID</TableHead>
                <TableHead className="h-11 p-3 font-medium">Device</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.length === 0 ? (
                <TableEmptyRow
                  colSpan={3}
                  title="No kiosk configurations yet"
                  action={<EmptyActionLink href="/dashboard/devices">Register a device</EmptyActionLink>}
                  description="Add a site-level default configuration, publish a version, and kiosks will sync on next login."
                />
              ) : (
                configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="p-3 font-medium">{config.configName ?? "Site default"}</TableCell>
                    <TableCell className="p-3 font-mono text-xs">{config.siteId}</TableCell>
                    <TableCell className="p-3 font-mono text-xs">{config.deviceId ?? "All devices at site"}</TableCell>
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
