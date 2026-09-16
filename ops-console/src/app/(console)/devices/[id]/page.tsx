import Link from "next/link";

import { DashboardErrorState } from "@/components/dashboard-state";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch, loadOrError } from "@/lib/api";

import { RequestGrantForm } from "../../organisations/_components/request-grant-form";
import { DeviceStatusControls } from "../_components/device-status-controls";

interface Device {
  id: string;
  organisationId: string;
  siteId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  cranComplianceStatusCode: string | null;
  cranCertificateReference: string | null;
  firmwareVersion: string | null;
  warrantyExpiresAt: string | null;
}

interface StatusHistoryRow {
  id: string;
  statusCode: string;
  occurredAt: string;
  actorId: string | null;
  reason: string | null;
}

// Reached from the organisation detail Devices tab
// (organisations/[id]/page.tsx's DevicesTab) — this is the drill-down
// into one device the flat tab list didn't have.
export default async function DeviceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organisationId?: string }>;
}) {
  const { id } = await params;
  const { organisationId } = await searchParams;

  if (!organisationId) {
    return (
      <DashboardErrorState message="Missing organisationId — open this device from an organisation's Devices tab." />
    );
  }

  const result = await loadOrError(async () => {
    const [device, history] = await Promise.all([
      apiFetch<Device>(`/platform/dashboard/devices/${id}?organisationId=${organisationId}`),
      apiFetch<StatusHistoryRow[]>(`/platform/dashboard/devices/${id}/status-history?organisationId=${organisationId}`),
    ]);
    return { device, history };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Device</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { device, history } = result.data;

  return (
    <div>
      <Link href={`/organisations/${organisationId}?tab=devices`} className="text-slate text-xs hover:text-foreground">
        ← Back to organisation
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading font-light text-2xl text-foreground">
            {device.manufacturer} {device.model}
          </h1>
          <p className="mt-1 text-slate text-sm">
            Serial {device.serialNumber} · compliance {device.cranComplianceStatusCode ?? "n/a"}
            {device.firmwareVersion ? ` · firmware ${device.firmwareVersion}` : ""}
            {device.warrantyExpiresAt
              ? ` · warranty until ${new Date(device.warrantyExpiresAt).toLocaleDateString()}`
              : ""}
          </p>
        </div>
        <DeviceStatusControls deviceId={device.id} organisationId={organisationId} />
      </div>

      <div className="mt-4">
        <RequestGrantForm organisationId={organisationId} />
      </div>

      <div className="mt-6">
        <h2 className="font-medium text-foreground text-sm">Status history</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-slate text-sm">No status changes recorded.</p>
        ) : (
          <List className="mt-2">
            {history.map((h) => (
              <ListRow key={h.id}>
                <p className="text-foreground text-sm">{h.statusCode}</p>
                <span className="text-slate text-xs">
                  {new Date(h.occurredAt).toLocaleString()}
                  {h.reason ? ` · ${h.reason}` : ""}
                </span>
              </ListRow>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}
