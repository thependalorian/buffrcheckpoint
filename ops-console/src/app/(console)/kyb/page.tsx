import Link from "next/link";

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
    const [pending, waiting, orgLabel, throughput] = await Promise.all([
      apiFetch<KybSubmission[]>("/platform/kyb/pending"),
      apiFetch<KybSubmission[]>("/platform/kyb/awaiting-organisation"),
      loadOrgLabelMap(),
      apiFetch<ThroughputPoint[]>("/platform/dashboard/kyb-throughput-trend"),
    ]);
    return { pending, waiting, orgLabel, throughput };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">KYB Review</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { pending, waiting, orgLabel, throughput } = result.data;

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">KYB Review</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Business-identity verification at onboarding only. Open a submission to read the documents beside the details,
        accept each document, and approve, ask for information or reject.
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
              href: `/kyb/${k.id}`,
              subtitle: `Reg #${k.businessRegistrationNumber} · ${orgLabel[k.organisationId] ?? k.organisationId} · submitted ${new Date(k.submittedAt).toLocaleDateString()}`,
              documentHref: k.registrationDocumentReference ? `/api/kyb-documents/${k.id}` : null,
            }))}
          />
        )}
      </div>

      {waiting.length > 0 ? (
        <div className="mt-8">
          <h2 className="font-semibold text-base">Waiting on the organisation</h2>
          <p className="text-muted-foreground text-xs">
            You asked for more information. These return to the queue when the organisation sends corrected details.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {waiting.map((k) => (
              <li key={k.id}>
                <Link href={`/kyb/${k.id}`} className="hover:underline">
                  {k.registeredBusinessName}
                </Link>{" "}
                <span className="text-muted-foreground text-xs">
                  {orgLabel[k.organisationId] ?? k.organisationId} · submitted{" "}
                  {new Date(k.submittedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
