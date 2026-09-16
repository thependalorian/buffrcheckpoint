import { TrendChart } from "@/components/charts/TrendChart";
import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgLabelMap } from "@/lib/orgs";

import { KybBulkQueue } from "./_components/kyb-bulk-queue";

interface KybSubmission {
  id: string;
  organisationId: string;
  businessRegistrationNumber: string;
  registeredBusinessName: string;
  registrationDocumentReference: string | null;
  submittedAt: string;
}

interface ThroughputPoint {
  period: string;
  count: number;
}

export default async function KybPage() {
  const result = await loadOrError(async () => {
    const [pending, orgLabel, throughput] = await Promise.all([
      apiFetch<KybSubmission[]>("/platform/kyb/pending"),
      loadOrgLabelMap(),
      apiFetch<ThroughputPoint[]>("/platform/dashboard/kyb-throughput-trend"),
    ]);
    return { pending, orgLabel, throughput };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">KYB Review</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { pending, orgLabel, throughput } = result.data;

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">KYB Review</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Business-identity verification at onboarding only — not ongoing sanctions/AML monitoring.
      </p>

      {throughput.length > 1 ? (
        <div className="mt-6">
          <TrendChart
            title="KYB decisions per week"
            finding="How fast the queue actually clears — verified + rejected, weekly. A flat line while the queue below grows means the bottleneck is reviewer capacity, not submission volume."
            data={throughput.map((t) => ({ period: t.period, value: t.count }))}
          />
        </div>
      ) : null}

      <div className="mt-6">
        {pending.length === 0 ? (
          <EmptyState
            title="Nothing in the KYB queue"
            description="When a customer organisation submits registration details, it appears here for approve/reject. Browse organisations to see each org's KYB tab."
            actionHref="/organisations"
            actionLabel="Open organisations"
          />
        ) : (
          <KybBulkQueue
            rows={pending.map((k) => ({
              id: k.id,
              title: k.registeredBusinessName,
              href: `/organisations/${k.organisationId}?tab=kyb`,
              subtitle: `Reg #${k.businessRegistrationNumber} · ${orgLabel[k.organisationId] ?? k.organisationId} · submitted ${new Date(k.submittedAt).toLocaleDateString()}`,
              documentHref: k.registrationDocumentReference ? `/api/kyb-documents/${k.id}` : null,
            }))}
          />
        )}
      </div>
    </div>
  );
}
