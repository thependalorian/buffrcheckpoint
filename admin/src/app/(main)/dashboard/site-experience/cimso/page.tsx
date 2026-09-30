import { CimsoConnectSheet } from "@/app/(main)/dashboard/site-experience/cimso/_components/cimso-connect-sheet";
import { CimsoConnectionsTable } from "@/app/(main)/dashboard/site-experience/cimso/_components/cimso-connections-table";
import { CimsoNotEnabledEmpty } from "@/app/(main)/dashboard/site-experience/cimso/_components/cimso-not-enabled-empty";
import { CimsoStatusCard } from "@/app/(main)/dashboard/site-experience/cimso/_components/cimso-status-card";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

interface SiteRow {
  id: string;
  name: string;
}

interface HostRow {
  id: string;
  siteId: string;
  displayName: string;
  active: boolean;
}

interface CimsoStatus {
  statusCode: string;
  orgEnabled: boolean;
  platformPublicStatus: string;
  afterNdaRequired: boolean;
  notes: string;
  transportConfigured: boolean;
  connections: Array<{
    id: string;
    siteId: string;
    siteName: string | null;
    statusCode: string;
    siteExternalId: string | null;
    enabledInterfaceTypes: number[];
    tcpHost: string | null;
    tcpPort: number | null;
    tlsEnabled: boolean;
    clientLoginId: string | null;
    credentialsSecretRef: string | null;
    defaultHostId: string | null;
    lastSyncAt: string | null;
    lastErrorCode: string | null;
    credentialsConfigured: boolean;
  }>;
}

export default async function CimsoIntegrationPage() {
  let status: CimsoStatus | null = null;
  let sites: SiteRow[] = [];
  let hosts: HostRow[] = [];
  let error: string | null = null;

  try {
    [status, sites, hosts] = await Promise.all([
      api.get<CimsoStatus>("/integrations/cimso/status"),
      api.get<SiteRow[]>("/sites"),
      api.get<HostRow[]>("/hosts"),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load CiMSO integration status.";
  }

  const orgEnabled = status?.orgEnabled === true;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="CiMSO INNterchange"
        description="Connect any site to CiMSO INNterchange (types 1 customer data, 3 lodging reservations, 4 front desk). Synced reservations become invitations for kiosk and website QR."
        action={orgEnabled && status ? <CimsoConnectSheet sites={sites} hosts={hosts} /> : undefined}
      />
      {error || !status ? (
        <DashboardErrorState message={error ?? "CiMSO status unavailable."} />
      ) : !orgEnabled ? (
        <CimsoNotEnabledEmpty platformStatus={status.platformPublicStatus} />
      ) : (
        <>
          <CimsoStatusCard
            statusCode={status.statusCode}
            transportConfigured={status.transportConfigured}
            afterNdaRequired={status.afterNdaRequired}
            notes={status.notes}
          />
          <CimsoConnectionsTable connections={status.connections} />
        </>
      )}
    </div>
  );
}
