import { BulkQueueList } from "@/components/bulk-queue-list";
import { ShareBars } from "@/components/charts/ShareBars";
import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { apiFetch, loadOrError } from "@/lib/api";

import { CreateIncidentForm, INCIDENT_STATUSES } from "./_components/incident-controls";

interface Incident {
  id: string;
  title: string;
  description: string | null;
  severityCode: string;
  statusCode: string;
  openedAt: string;
  resolvedAt: string | null;
}

interface TypeDefinitionRow {
  id: string;
  code: string;
  label: string;
}

export default async function IncidentsPage() {
  const result = await loadOrError(async () => {
    const [incidents, severities] = await Promise.all([
      apiFetch<Incident[]>("/platform/incidents"),
      apiFetch<TypeDefinitionRow[]>("/type-definitions?domain=incident_severity"),
    ]);
    return { incidents, severities };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Incidents</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { incidents, severities } = result.data;
  const severityLabel = new Map(severities.map((s) => [s.id, s.label]));
  const severityCounts = new Map<string, number>();
  for (const incident of incidents) {
    const label = severityLabel.get(incident.severityCode) ?? "unknown";
    severityCounts.set(label, (severityCounts.get(label) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">Incidents</h1>
      <p className="mt-1 text-muted-foreground text-sm">Platform-wide operational incidents.</p>

      {incidents.length > 0 ? (
        <div className="mt-6">
          <ShareBars
            title="Open incidents by severity"
            finding="Where response effort is concentrated right now."
            data={[...severityCounts.entries()].map(([label, value]) => ({ label, value }))}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <h2 className="mb-2 font-medium text-sm">Open an incident</h2>
        <CreateIncidentForm />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 font-medium text-sm">Active and recent</h2>
        {incidents.length === 0 ? (
          <EmptyState
            title="No incidents recorded"
            description="Open an incident above when a capability, payment path, or customer-facing outage needs a tracked response. Resolved incidents stay listed for audit."
          />
        ) : (
          <BulkQueueList
            kind="incident"
            statuses={INCIDENT_STATUSES}
            rows={incidents.map((incident) => ({
              id: incident.id,
              title: incident.title,
              href: `/incidents/${incident.id}`,
              subtitle: `${severityLabel.get(incident.severityCode) ?? "unknown"} · opened ${new Date(
                incident.openedAt,
              ).toLocaleString()}${
                incident.resolvedAt ? ` · resolved ${new Date(incident.resolvedAt).toLocaleString()}` : ""
              }`,
            }))}
          />
        )}
      </div>
    </div>
  );
}
