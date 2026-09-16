import Link from "next/link";

import { DashboardErrorState } from "@/components/dashboard-state";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgLabelMap } from "@/lib/orgs";

interface AuditEvent {
  id: string;
  supportSessionId: string;
  platformUserId: string;
  organisationId: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeValue: unknown;
  afterValue: unknown;
  occurredAt: string;
}

export default async function AuditEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await loadOrError(async () => {
    const [event, orgLabel] = await Promise.all([
      apiFetch<AuditEvent>(`/platform/support-access/audit/${id}`),
      loadOrgLabelMap(),
    ]);
    return { event, orgLabel };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Audit event</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { event, orgLabel } = result.data;

  return (
    <div>
      <Link href="/audit" className="text-slate text-xs hover:text-foreground">
        ← Audit log
      </Link>
      <h1 className="mt-2 font-heading font-light text-2xl text-foreground">{event.action}</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        {new Date(event.occurredAt).toLocaleString()} ·{" "}
        <Link href={`/organisations/${event.organisationId}`} className="hover:underline">
          {orgLabel[event.organisationId] ?? event.organisationId}
        </Link>
      </p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-xs">Entity</dt>
          <dd className="font-mono text-xs">
            {event.entityType}/{event.entityId}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Support session</dt>
          <dd className="font-mono text-xs">{event.supportSessionId}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Platform user</dt>
          <dd className="font-mono text-xs">{event.platformUserId}</dd>
        </div>
      </dl>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="font-medium text-sm">Before</h2>
          <pre className="mt-2 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
            {event.beforeValue == null ? "—" : JSON.stringify(event.beforeValue, null, 2)}
          </pre>
        </div>
        <div>
          <h2 className="font-medium text-sm">After</h2>
          <pre className="mt-2 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
            {event.afterValue == null ? "—" : JSON.stringify(event.afterValue, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
