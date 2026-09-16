import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

import { AuditLogTable } from "./_components/audit-log-table";
import type { AuditEventPage } from "./_components/types";

export default async function AuditLogPage() {
  let page: AuditEventPage = { events: [], nextCursor: null };
  let error: string | null = null;
  try {
    page = await api.get<AuditEventPage>("/audit/events");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load the audit log.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Audit Log"
        description="Immutable sensitive-read, export, correction, deletion, and role-change events."
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <AuditLogTable initialEvents={page.events} initialCursor={page.nextCursor} />
      )}
    </div>
  );
}
