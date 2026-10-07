import Link from "next/link";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/client";
import { deviceSupportCopy as copy } from "@/lib/copy/site-notices";

import { DeviceSupportQr } from "./_components/device-support-qr";

interface Device {
  id: string;
  deviceName: string | null;
  manufacturer: string;
  model: string;
  serialNumber: string;
  siteId: string;
  firmwareVersion: string | null;
  cranCertificateReference: string | null;
  warrantyExpiresAt: string | null;
  mdmEnrolmentStatus: string | null;
  radioWifi: boolean;
  radioBluetooth: boolean;
  radioNfc: boolean;
  radioCellular: boolean;
}

interface SupportQr {
  payload: string;
  caption: string;
}

interface HistoryRow {
  id: string;
  occurredAt: string;
  statusCode?: string | null;
  reason?: string | null;
}

const radios = (d: Device) =>
  [d.radioWifi && "Wi-Fi", d.radioBluetooth && "Bluetooth", d.radioNfc && "NFC", d.radioCellular && "Cellular"]
    .filter(Boolean)
    .join(", ") || "None";

export default async function DeviceSupportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let device: Device | null = null;
  let qr: SupportQr | null = null;
  let history: HistoryRow[] = [];
  let error: string | null = null;
  try {
    [device, qr, history] = await Promise.all([
      api.get<Device>(`/devices/${id}`),
      api.get<SupportQr>(`/devices/${id}/support-qr`),
      api.get<HistoryRow[]>(`/devices/${id}/status-history`).catch(() => []),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load this device.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={copy.title}
        description={copy.description}
        action={
          <Link href="/dashboard/devices" className="text-sm underline underline-offset-2">
            {copy.back}
          </Link>
        }
      />
      {error || !device || !qr ? (
        <DashboardErrorState message={error ?? "Could not load this device."} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-3 rounded-lg border border-border p-4">
            <h2 className="font-medium">{copy.details}</h2>
            <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{device.deviceName ?? "Not named"}</dd>
              <dt className="text-muted-foreground">Make and model</dt>
              <dd>
                {device.manufacturer} {device.model}
              </dd>
              <dt className="text-muted-foreground">Serial number</dt>
              <dd className="font-mono">{device.serialNumber}</dd>
              <dt className="text-muted-foreground">Firmware</dt>
              <dd>{device.firmwareVersion ?? "Not recorded"}</dd>
              <dt className="text-muted-foreground">Radios</dt>
              <dd>{radios(device)}</dd>
              <dt className="text-muted-foreground">MDM</dt>
              <dd>
                <Badge variant={device.mdmEnrolmentStatus ? "secondary" : "outline"}>
                  {device.mdmEnrolmentStatus ? "Enrolled" : "Not enrolled"}
                </Badge>
              </dd>
              <dt className="text-muted-foreground">CRAN certificate</dt>
              <dd>{device.cranCertificateReference ?? "Not recorded"}</dd>
              <dt className="text-muted-foreground">Warranty until</dt>
              <dd>
                {device.warrantyExpiresAt
                  ? new Date(device.warrantyExpiresAt).toLocaleDateString("en-GB")
                  : "Not recorded"}
              </dd>
            </dl>
            <h3 className="pt-2 font-medium text-sm">{copy.statusHistory}</h3>
            {history.length === 0 ? (
              <p className="text-muted-foreground text-sm">{copy.noHistory}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {history.slice(0, 8).map((row) => (
                  <li key={row.id}>
                    {new Date(row.occurredAt).toLocaleString("en-GB")}: {row.statusCode ?? "status change"}
                    {row.reason ? ` (${row.reason})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="space-y-3 rounded-lg border border-border p-4">
            <h2 className="font-medium">{copy.qrHeading}</h2>
            <p className="text-muted-foreground text-sm">{copy.qrHelp}</p>
            <DeviceSupportQr url={qr.payload} caption={qr.caption} />
          </section>
        </div>
      )}
    </div>
  );
}
