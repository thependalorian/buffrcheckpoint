import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, EmptyActionLink, TableEmptyRow } from "@/components/dashboard-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

interface DeviceRow {
  id: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  cranComplianceStatusCode: string | null;
  cranCertificateReference: string | null;
  supplierEvidenceReference: string | null;
}

interface TypeDefinitionRow {
  id: string;
  code: string;
  label: string;
}

const APPROVED_CODE = "approved_for_deployment";

export default async function DeviceCompliancePage() {
  let devices: DeviceRow[] = [];
  let statusLabels = new Map<string, string>();
  let statusCodes = new Map<string, string>();
  let error: string | null = null;
  try {
    const [deviceRows, statuses] = await Promise.all([
      api.get<DeviceRow[]>("/devices"),
      api.get<TypeDefinitionRow[]>("/type-definitions?domain=cran_compliance_status"),
    ]);
    devices = deviceRows;
    statusLabels = new Map(statuses.map((s) => [s.id, s.label]));
    statusCodes = new Map(statuses.map((s) => [s.id, s.code]));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load the device compliance register.";
  }

  return (
    <div className="min-w-0 space-y-6">
      <DashboardPageHeader
        title="Device Compliance Register"
        description="CRAN assessment, certificate or exemption evidence, firmware, and asset status."
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="bc-panel min-w-0 overflow-x-auto p-0!">
          <Table className="min-w-[40rem]">
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Device</TableHead>
                <TableHead className="h-11 p-3 font-medium">Serial</TableHead>
                <TableHead className="h-11 p-3 font-medium">CRAN status</TableHead>
                <TableHead className="h-11 p-3 font-medium">Certificate reference</TableHead>
                <TableHead className="h-11 p-3 font-medium">Deployable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 ? (
                <TableEmptyRow
                  colSpan={5}
                  title="Nothing to assess yet"
                  action={<EmptyActionLink href="/dashboard/devices">Register a device</EmptyActionLink>}
                  description="Register a device first. Its CRAN compliance walk (unassessed → approved for deployment) tracks here."
                />
              ) : (
                devices.map((device) => {
                  const isDeployable =
                    device.cranComplianceStatusCode !== null &&
                    statusCodes.get(device.cranComplianceStatusCode) === APPROVED_CODE;
                  return (
                    <TableRow key={device.id}>
                      <TableCell className="p-3 font-medium">
                        {device.manufacturer} {device.model}
                      </TableCell>
                      <TableCell className="p-3 font-mono text-xs">{device.serialNumber}</TableCell>
                      <TableCell className="p-3">
                        {device.cranComplianceStatusCode
                          ? (statusLabels.get(device.cranComplianceStatusCode) ?? "Unknown")
                          : "Unassessed"}
                      </TableCell>
                      <TableCell className="p-3">{device.cranCertificateReference ?? "—"}</TableCell>
                      <TableCell className="p-3">
                        <Badge variant={isDeployable ? "secondary" : "outline"}>{isDeployable ? "Yes" : "No"}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
