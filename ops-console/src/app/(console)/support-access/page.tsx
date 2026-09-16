import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgOptions } from "@/lib/orgs";

import { type Grant, GrantRow } from "./_components/grant-row";
import { NewGrantForm } from "./_components/new-grant-form";

export default async function SupportAccessPage() {
  const result = await loadOrError(async () => {
    const [grants, orgs] = await Promise.all([apiFetch<Grant[]>("/platform/support-access/grants"), loadOrgOptions()]);
    return { grants, orgs };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Support Access</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { grants, orgs } = result.data;

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">Support Access</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Break-glass access — exceptional, time-boxed, reason-coded, fully logged, and customer-approved. A request
        cannot be used until the target organisation&apos;s admin approves it.
      </p>

      <div className="mt-6">
        <h2 className="mb-2 font-medium text-sm">Request access</h2>
        {orgs.length === 0 ? (
          <EmptyState
            title="No organisations to target"
            description="Create or onboard a customer organisation first, then request a grant against it."
            actionHref="/organisations"
            actionLabel="View organisations"
          />
        ) : (
          <NewGrantForm orgs={orgs} />
        )}
      </div>

      <div className="mt-8 space-y-2">
        <h2 className="font-medium text-sm">Your requests</h2>
        {grants.length === 0 ? (
          <EmptyState
            title="No support grants yet"
            description="Request a grant above. After the customer approves it in admin, mint a session and open their tenant under the acting-as banner."
          />
        ) : (
          grants.map((grant) => <GrantRow key={grant.id} grant={grant} />)
        )}
      </div>
    </div>
  );
}
