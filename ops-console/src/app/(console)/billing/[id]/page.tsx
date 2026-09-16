import Link from "next/link";

import { DashboardErrorState } from "@/components/dashboard-state";
import { List, ListRow } from "@/components/ui/list";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgLabelMap } from "@/lib/orgs";

interface LineItem {
  id: string;
  description: string;
  amount: string;
  quantity: number;
}

interface Payment {
  id: string;
  amount: string;
  currencyCode: string;
  statusCode: string;
  popDocumentReference: string | null;
  occurredAt: string;
}

interface Reconciliation {
  id: string;
  paymentTransactionId: string;
  decision: string;
  note: string | null;
  reconciledAt: string;
  reviewedBy: string;
}

interface InvoiceDetail {
  id: string;
  organisationId: string;
  invoiceNumber: string;
  amount: string;
  currencyCode: string;
  statusCode: string;
  issuedAt: string;
  dueAt: string | null;
  lineItems: LineItem[];
  payments: Payment[];
  reconciliationLog: Reconciliation[];
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await loadOrError(async () => {
    const [invoice, orgLabel] = await Promise.all([
      apiFetch<InvoiceDetail>(`/platform/billing/invoices/${id}`),
      loadOrgLabelMap(),
    ]);
    return { invoice, orgLabel };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Invoice</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { invoice, orgLabel } = result.data;

  return (
    <div>
      <Link href="/billing" className="text-slate text-xs hover:text-foreground">
        ← Billing
      </Link>
      <h1 className="mt-2 font-heading font-light text-2xl text-foreground">{invoice.invoiceNumber}</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        {invoice.currencyCode} {invoice.amount} · status {invoice.statusCode}
        {invoice.dueAt ? ` · due ${new Date(invoice.dueAt).toLocaleDateString()}` : ""}
      </p>
      <Link
        href={`/organisations/${invoice.organisationId}`}
        className="mt-1 inline-block text-foreground text-xs hover:underline"
      >
        {orgLabel[invoice.organisationId] ?? invoice.organisationId} →
      </Link>

      <div className="mt-6">
        <h2 className="font-medium text-foreground text-sm">Line items</h2>
        {invoice.lineItems.length === 0 ? (
          <p className="mt-2 text-slate text-sm">No line items.</p>
        ) : (
          <List className="mt-2">
            {invoice.lineItems.map((li) => (
              <ListRow key={li.id}>
                <span className="text-foreground text-sm">{li.description}</span>
                <span className="text-slate text-sm">
                  ×{li.quantity} · {invoice.currencyCode} {li.amount}
                </span>
              </ListRow>
            ))}
          </List>
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-medium text-foreground text-sm">Payments</h2>
        {invoice.payments.length === 0 ? (
          <p className="mt-2 text-slate text-sm">No payment submissions.</p>
        ) : (
          <List className="mt-2">
            {invoice.payments.map((p) => (
              <ListRow key={p.id}>
                <div>
                  <p className="text-foreground text-sm">
                    {p.currencyCode} {p.amount} · {p.statusCode}
                  </p>
                  <p className="text-slate text-xs">{new Date(p.occurredAt).toLocaleString()}</p>
                </div>
                {p.popDocumentReference ? (
                  <a href={`/api/pop-documents/${p.id}`} className="text-xs hover:underline">
                    Download POP
                  </a>
                ) : null}
              </ListRow>
            ))}
          </List>
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-medium text-foreground text-sm">Reconciliation log</h2>
        {invoice.reconciliationLog.length === 0 ? (
          <p className="mt-2 text-slate text-sm">No reconciliation decisions yet.</p>
        ) : (
          <List className="mt-2">
            {invoice.reconciliationLog.map((r) => (
              <ListRow key={r.id}>
                <p className="text-foreground text-sm">{r.decision}</p>
                <span className="text-slate text-xs">
                  {new Date(r.reconciledAt).toLocaleString()}
                  {r.note ? ` · ${r.note}` : ""}
                </span>
              </ListRow>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}
