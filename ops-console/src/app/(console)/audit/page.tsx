import Link from "next/link";

import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { List, ListRow } from "@/components/ui/list";
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
  occurredAt: string;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ organisationId?: string; action?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const organisationId = params.organisationId?.trim() || undefined;
  const action = params.action?.trim() || undefined;
  const from = params.from?.trim() || undefined;
  const to = params.to?.trim() || undefined;

  const qs = new URLSearchParams();
  if (organisationId) qs.set("organisationId", organisationId);
  if (action) qs.set("action", action);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  const result = await loadOrError(async () => {
    const [events, orgLabel] = await Promise.all([
      apiFetch<AuditEvent[]>(`/platform/support-access/audit${query}`),
      loadOrgLabelMap(),
    ]);
    return { events, orgLabel };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Support-Session Audit</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { events, orgLabel } = result.data;
  const orgOptions = Object.entries(orgLabel).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">Support-Session Audit</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Every write made under a break-glass support session — separate from each org&apos;s own audit trail.
      </p>

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
        <input
          name="action"
          defaultValue={action ?? ""}
          placeholder="Action filter"
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <input
          type="date"
          name="from"
          defaultValue={from ?? ""}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          aria-label="From date"
        />
        <input
          type="date"
          name="to"
          defaultValue={to ?? ""}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          aria-label="To date"
        />
        <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Filter
        </button>
      </form>

      <div className="mt-6">
        {events.length === 0 ? (
          <EmptyState
            title="No support-session writes yet"
            description="Break-glass edits appear here after a customer-approved grant is used."
            actionHref="/support-access"
            actionLabel="Support access"
          />
        ) : (
          <List>
            {events.map((e) => (
              <ListRow key={e.id}>
                <Link href={`/audit/${e.id}`} className="min-w-0 hover:underline">
                  <p className="text-foreground text-sm">{e.action}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(e.occurredAt).toLocaleString()} ·{" "}
                    {orgLabel[e.organisationId] ?? e.organisationId} · {e.entityType}/{e.entityId.slice(0, 8)}
                  </p>
                </Link>
              </ListRow>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}
