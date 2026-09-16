import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/me";

import { GrantHistory, type GrantHistoryRow } from "./_components/grant-history";
import { PendingGrantCard } from "./_components/pending-grant-card";

interface PendingGrant {
  id: string;
  reasonLabel: string;
  requestedDurationMs: number;
}

// Customer-side consent gate for Buffr Checkpoint's internal break-glass
// support access (buffrcheckpoint.md Section 9.2 rule 4, Section 11.9.1a) —
// no platform_support session can ever be minted against this organisation
// until an owner_operator/system_administrator here explicitly approves
// it. Reused nowhere else — this is the one screen that exists purely to
// let a customer say yes or no.
export default async function SupportAccessPage() {
  const me = await getCurrentUser();
  if (!me) return null;

  let grants: PendingGrant[] = [];
  let history: GrantHistoryRow[] = [];
  let error: string | null = null;
  try {
    [grants, history] = await Promise.all([
      api.get<PendingGrant[]>(`/platform/support-access/pending?organisationId=${me.activeOrganisation.id}`),
      api.get<GrantHistoryRow[]>(`/platform/support-access/history?organisationId=${me.activeOrganisation.id}`),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load support access.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Support Access"
        description="Requests from Buffr Checkpoint's internal support team for time-boxed access to your account. Nothing is granted without your approval."
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : grants.length === 0 ? (
        <p className="text-muted-foreground text-sm">No pending requests.</p>
      ) : (
        <div className="space-y-4">
          {grants.map((grant) => (
            <PendingGrantCard key={grant.id} grant={grant} />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-medium text-lg">Past approvals and sessions</h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No decided support-access requests yet.</p>
        ) : (
          <GrantHistory rows={history} />
        )}
      </div>
    </div>
  );
}
