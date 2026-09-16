import Link from "next/link";

import { DashboardErrorState } from "@/components/dashboard-state";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgLabelMap } from "@/lib/orgs";

import { RequestGrantForm } from "../../organisations/_components/request-grant-form";
import { StatusControls } from "../_components/incident-controls";

interface Incident {
  id: string;
  title: string;
  description: string | null;
  severityCode: string;
  statusCode: string;
  openedAt: string;
  resolvedAt: string | null;
}

interface StatusEvent {
  id: string;
  fromStatusCode: string | null;
  toStatusCode: string;
  occurredAt: string;
  actorId: string | null;
  note: string | null;
}

interface AffectedOrg {
  id: string;
  organisationId: string;
}

interface TypeDefinitionRow {
  id: string;
  code: string;
  label: string;
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await loadOrError(async () => {
    const [incident, history, affected, severities, statuses, orgLabel] = await Promise.all([
      apiFetch<Incident>(`/platform/incidents/${id}`),
      apiFetch<StatusEvent[]>(`/platform/incidents/${id}/status-history`),
      apiFetch<AffectedOrg[]>(`/platform/incidents/${id}/affected-organisations`),
      apiFetch<TypeDefinitionRow[]>("/type-definitions?domain=incident_severity"),
      apiFetch<TypeDefinitionRow[]>("/type-definitions?domain=incident_status"),
      loadOrgLabelMap(),
    ]);
    return { incident, history, affected, severities, statuses, orgLabel };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Incident</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { incident, history, affected, severities, statuses, orgLabel } = result.data;
  const severityLabel = new Map(severities.map((s) => [s.id, s.label]));
  const statusLabel = new Map(statuses.map((s) => [s.id, s.label]));

  return (
    <div>
      <Link href="/incidents" className="text-slate text-xs hover:text-foreground">
        ← All incidents
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading font-light text-2xl text-foreground">{incident.title}</h1>
          <p className="mt-1 text-slate text-sm">
            {severityLabel.get(incident.severityCode) ?? "unknown"} ·{" "}
            {statusLabel.get(incident.statusCode) ?? "unknown"} · opened {new Date(incident.openedAt).toLocaleString()}
            {incident.resolvedAt ? ` · resolved ${new Date(incident.resolvedAt).toLocaleString()}` : ""}
          </p>
        </div>
        <StatusControls incidentId={incident.id} />
      </div>

      {incident.description ? <p className="mt-4 text-foreground text-sm">{incident.description}</p> : null}

      {affected.length > 0 ? (
        <div className="mt-6">
          <h2 className="font-medium text-foreground text-sm">Affected organisations</h2>
          <List className="mt-2">
            {affected.map((a) => (
              <ListRow key={a.id}>
                <Link href={`/organisations/${a.organisationId}`} className="text-foreground text-sm hover:underline">
                  {orgLabel[a.organisationId] ?? a.organisationId}
                </Link>
                <RequestGrantForm organisationId={a.organisationId} />
              </ListRow>
            ))}
          </List>
        </div>
      ) : null}

      <div className="mt-6">
        <h2 className="font-medium text-foreground text-sm">Status timeline</h2>
        <List className="mt-2">
          {history.map((e) => (
            <ListRow key={e.id}>
              <p className="text-foreground text-sm">
                {e.fromStatusCode ? `${statusLabel.get(e.fromStatusCode) ?? e.fromStatusCode} → ` : "opened as "}
                {statusLabel.get(e.toStatusCode) ?? e.toStatusCode}
              </p>
              <span className="text-slate text-xs">
                {new Date(e.occurredAt).toLocaleString()}
                {e.note ? ` · ${e.note}` : ""}
              </span>
            </ListRow>
          ))}
        </List>
      </div>
    </div>
  );
}
