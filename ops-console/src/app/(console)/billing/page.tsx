import { TrendChart } from "@/components/charts/TrendChart";
import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { StatCard } from "@/components/ui/card";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgLabelMap } from "@/lib/orgs";

import { BillingBulkQueue } from "./_components/billing-bulk-queue";

interface Rollup {
  activeSubscriptionCount: number;
  mrr: number;
  arr: number;
}

interface TrendPoint {
  period: string;
  count: number;
}

interface PendingPayment {
  id: string;
  organisationId: string;
  amount: string;
  currencyCode: string;
  popDocumentReference: string | null;
  occurredAt: string;
}

export default async function BillingPage() {
  const result = await loadOrError(async () => {
    const [rollup, pending, orgLabel, mrrTrend, revenueTrend] = await Promise.all([
      apiFetch<Rollup>("/platform/billing/rollup"),
      apiFetch<PendingPayment[]>("/platform/billing/payments/pending-review"),
      loadOrgLabelMap(),
      apiFetch<TrendPoint[]>("/platform/dashboard/mrr-trend"),
      apiFetch<TrendPoint[]>("/platform/dashboard/invoiced-revenue-trend"),
    ]);
    return { rollup, pending, orgLabel, mrrTrend, revenueTrend };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Billing</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { rollup, pending, orgLabel, mrrTrend, revenueTrend } = result.data;

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">Billing</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Manual EFT + Proof of Payment reconciliation — no PSP partnership yet.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active subscriptions" value={rollup.activeSubscriptionCount} />
        <StatCard label="MRR" value={`NAD ${rollup.mrr.toFixed(2)}`} />
        <StatCard label="ARR" value={`NAD ${rollup.arr.toFixed(2)}`} />
      </div>

      {mrrTrend.length > 1 || revenueTrend.length > 1 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {mrrTrend.length > 1 ? (
            <TrendChart
              title="MRR over time"
              finding="Committed monthly revenue across active subscriptions — whether the book is growing or shrinking."
              data={mrrTrend.map((t) => ({ period: t.period, value: t.count }))}
            />
          ) : null}
          {revenueTrend.length > 1 ? (
            <TrendChart
              title="Invoiced revenue"
              finding="What was actually billed, by month — distinct from committed MRR, which counts subscriptions regardless of invoicing."
              data={revenueTrend.map((t) => ({ period: t.period, value: t.count }))}
            />
          ) : null}
        </div>
      ) : null}

      <h2 className="mt-8 font-medium text-foreground text-sm">Proof-of-payment review queue</h2>
      <div className="mt-3">
        {pending.length === 0 ? (
          <EmptyState
            title="No POP submissions waiting"
            description="Customer EFT proofs uploaded from admin billing land here for match-or-reject. Open an organisation to inspect its subscription and invoices."
            actionHref="/organisations"
            actionLabel="Open organisations"
          />
        ) : (
          <BillingBulkQueue
            rows={pending.map((p) => ({
              id: p.id,
              title: `${p.currencyCode} ${p.amount} — ${orgLabel[p.organisationId] ?? p.organisationId}`,
              href: `/organisations/${p.organisationId}?tab=billing`,
              subtitle: `Submitted ${new Date(p.occurredAt).toLocaleString()}`,
              documentHref: p.popDocumentReference ? `/api/pop-documents/${p.id}` : null,
            }))}
          />
        )}
      </div>
    </div>
  );
}
