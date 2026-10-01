import { BcStatRow, BcStatTile } from "@/components/bc-panel";
import { TrendChart } from "@/components/charts/TrendChart";
import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading font-light text-2xl text-foreground">Billing</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Bank transfer with proof-of-payment review, and card payments through Adumo Online (validated automatically
            when enabled).
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/payment-register?format=csv" className="rounded-md border border-border px-3 py-1.5 text-sm">
            Payment register (CSV)
          </a>
          <a href="/api/payment-register?format=xlsx" className="rounded-md border border-border px-3 py-1.5 text-sm">
            Payment register (Excel)
          </a>
        </div>
      </div>

      <div className="mt-6">
        <BcStatRow>
          <BcStatTile label="Active subscriptions" value={rollup.activeSubscriptionCount} />
          <BcStatTile label="MRR" value={`NAD ${rollup.mrr.toFixed(2)}`} />
          <BcStatTile label="ARR" value={`NAD ${rollup.arr.toFixed(2)}`} />
        </BcStatRow>
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
      <div className="bc-panel mt-3">
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
