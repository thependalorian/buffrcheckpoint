import Link from "next/link";

import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { Card, CardContent, StatCard } from "@/components/ui/card";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgLabelMap } from "@/lib/orgs";

interface DeviceRow {
  id: string;
  organisationId: string;
  siteId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  cranComplianceStatusCode: string | null;
  firmwareVersion: string | null;
}

interface DeviceBacklogSummary {
  deviceCount: number;
  offlineDeviceCount: number;
  pendingNotificationCount: number;
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ organisationId?: string }>;
}) {
  const params = await searchParams;
  const organisationId = params.organisationId?.trim() || undefined;
  const qs = organisationId ? `?organisationId=${organisationId}` : "";

  const result = await loadOrError(async () => {
    const [devices, orgLabel, backlog] = await Promise.all([
      apiFetch<DeviceRow[]>(`/platform/dashboard/devices${qs}`),
      loadOrgLabelMap(),
      apiFetch<DeviceBacklogSummary>("/platform/dashboard/device-backlog").catch(() => null),
    ]);
    return { devices, orgLabel, backlog };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Devices</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { devices, orgLabel, backlog } = result.data;
  const orgOptions = Object.entries(orgLabel).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">Devices</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Cross-organisation kiosk register and CRAN compliance status.
      </p>

      {backlog ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Registered devices" value={String(backlog.deviceCount ?? 0)} />
          <StatCard label="Latest status offline" value={String(backlog.offlineDeviceCount ?? 0)} />
          <StatCard label="Pending host notifications" value={String(backlog.pendingNotificationCount ?? 0)} />
        </div>
      ) : null}

      <Card className="mt-4 border-dashed">
        <CardContent className="py-3 text-muted-foreground text-xs">
          Offline backlog on this KPI is what the server can see: devices whose latest operational status is offline, plus
          notification rows still queued. The kiosk&apos;s encrypted on-device outbox never reaches the backend.
        </CardContent>
      </Card>

      <form className="mt-4 flex flex-wrap gap-3" method="get">
        <select
          name="organisationId"
          defaultValue={organisationId ?? ""}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">All organisations</option>
          {orgOptions.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Filter
        </button>
      </form>

      <div className="mt-6">
        {devices.length === 0 ? (
          <EmptyState
            title="No devices registered"
            description="Devices appear here after a customer provisions a kiosk at a site."
            actionHref="/organisations"
            actionLabel="Organisations"
          />
        ) : (
          <List>
            {devices.map((d) => (
              <ListRow key={d.id}>
                <Link
                  href={`/devices/${d.id}?organisationId=${d.organisationId}`}
                  className="min-w-0 hover:underline"
                >
                  <p className="text-foreground text-sm">
                    {d.manufacturer} {d.model}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {orgLabel[d.organisationId] ?? d.organisationId} · serial {d.serialNumber}
                  </p>
                </Link>
                <span className="text-muted-foreground text-xs">
                  {d.cranComplianceStatusCode ?? "unassessed"}
                </span>
              </ListRow>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}
