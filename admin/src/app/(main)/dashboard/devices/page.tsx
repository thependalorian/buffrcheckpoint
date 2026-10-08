import Link from "next/link";

import {
  CreateDeviceSheet,
  DeviceStatusButton,
  RetireDeviceButton,
} from "@/app/(main)/dashboard/_components/policy-create-sheets";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, EmptyActionLink, TableEmptyRow } from "@/components/dashboard-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

import { ActivateDeviceButton } from "./_components/activate-device-button";

interface DeviceRow {
  id: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  siteId: string;
  mdmEnrolmentStatus: string | null;
}

interface BacklogSummary {
  deviceCount: number;
  offlineDeviceCount: number;
  pendingNotificationCount: number;
}

export default async function DevicesPage() {
  let devices: DeviceRow[] = [];
  let sites: Array<{ id: string; name: string }> = [];
  let backlog: BacklogSummary | null = null;
  let error: string | null = null;
  try {
    [devices, sites, backlog] = await Promise.all([
      api.get<DeviceRow[]>("/devices"),
      api.get<Array<{ id: string; name: string }>>("/sites"),
      api.get<BacklogSummary>("/devices/backlog").catch(() => null),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load devices.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Devices"
        description="Kiosks, tablets, NFC readers, printers, and MDM status."
        action={<CreateDeviceSheet sites={sites} />}
      />
      {backlog && (backlog.offlineDeviceCount > 0 || backlog.pendingNotificationCount > 0) ? (
        <Alert>
          <AlertTitle>Connectivity backlog (server-visible)</AlertTitle>
          <AlertDescription>
            {backlog.offlineDeviceCount} device(s) report offline status; {backlog.pendingNotificationCount} host
            notification(s) still queued. On-device check-in drafts in the kiosk outbox are not included here.
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Device</TableHead>
                <TableHead className="h-11 p-3 font-medium">Serial</TableHead>
                <TableHead className="h-11 p-3 font-medium">MDM</TableHead>
                <TableHead className="h-11 p-3 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 ? (
                <TableEmptyRow
                  colSpan={4}
                  title="No devices registered yet"
                  action={<EmptyActionLink href="/dashboard/site-experience/kiosk">Set up a kiosk</EmptyActionLink>}
                  description="Register a device before CRAN activation and site deployment."
                />
              ) : (
                devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="p-3 font-medium">
                      {device.manufacturer} {device.model}
                    </TableCell>
                    <TableCell className="p-3 font-mono text-xs">{device.serialNumber}</TableCell>
                    <TableCell className="p-3">
                      <Badge variant={device.mdmEnrolmentStatus ? "secondary" : "outline"}>
                        {device.mdmEnrolmentStatus ? "Enrolled" : "Not enrolled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Link
                          href={`/dashboard/devices/${device.id}`}
                          className="inline-flex h-7 items-center rounded-md border px-2 text-xs"
                        >
                          Support QR
                        </Link>
                        <ActivateDeviceButton deviceId={device.id} />
                        <DeviceStatusButton deviceId={device.id} />
                        <RetireDeviceButton deviceId={device.id} />
                      </div>
                    </TableCell>
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
