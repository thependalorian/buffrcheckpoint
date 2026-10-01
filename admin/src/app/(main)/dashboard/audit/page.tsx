import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

import { AuditLogTable } from "./_components/audit-log-table";
import type { AuditEventPage } from "./_components/types";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  let page: AuditEventPage = { events: [], nextCursor: null };
  let error: string | null = null;
  try {
    const qs = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) });
    page = await api.get<AuditEventPage>(`/audit/events${qs.toString() ? `?${qs}` : ""}`);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load the audit log.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Audit Log"
        description="Immutable sensitive-read, export, correction, deletion, and role-change events."
        action={
          <div className="flex gap-2">
            <a
              href={`/api/audit/export?format=csv${from ? `&from=${encodeURIComponent(from)}` : ""}${to ? `&to=${encodeURIComponent(to)}` : ""}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              Download CSV
            </a>
            <a
              href={`/api/audit/export?format=xlsx${from ? `&from=${encodeURIComponent(from)}` : ""}${to ? `&to=${encodeURIComponent(to)}` : ""}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              Download Excel
            </a>
          </div>
        }
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <AuditLogTable initialEvents={page.events} initialCursor={page.nextCursor} dateRange={{ from, to }} />
      )}
    </div>
  );
}
