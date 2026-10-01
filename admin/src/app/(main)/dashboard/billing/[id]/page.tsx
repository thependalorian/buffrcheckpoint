import Link from "next/link";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/me";
import { billingCopy } from "@/lib/copy/billing";

import { PopUploadForm } from "../_components/pop-upload-form";

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
  occurredAt: string;
}

interface Reconciliation {
  id: string;
  decision: string;
  note: string | null;
  reconciledAt: string;
}

interface InvoiceDetail {
  id: string;
  organisationId: string;
  invoiceNumber: string;
  amount: string;
  currencyCode: string;
  statusCode: string;
  statusKey?: string | null;
  issuedAt: string;
  dueAt: string | null;
  lineItems: LineItem[];
  payments: Payment[];
  reconciliationLog: Reconciliation[];
}

interface PaymentInstructions {
  bankName: string;
  accountName: string;
  accountNumber: string | null;
  branchCode: string | null;
  complete: boolean;
}

export default async function CustomerInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return null;
  const { id } = await params;

  let invoice: InvoiceDetail | null = null;
  let bank: PaymentInstructions | null = null;
  let error: string | null = null;
  try {
    [invoice, bank] = await Promise.all([
      api.get<InvoiceDetail>(`/platform/billing/invoices/${id}/customer?organisationId=${me.activeOrganisation.id}`),
      api.get<PaymentInstructions>("/platform/billing/payment-instructions").catch(() => null),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load invoice.";
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader title="Invoice" description="Invoice detail" />
        <DashboardErrorState message={error ?? "Invoice not found"} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={invoice.invoiceNumber}
        description={`${invoice.currencyCode} ${invoice.amount} · ${invoice.statusKey ?? invoice.statusCode}`}
      />
      <Link href="/dashboard/billing" className="text-muted-foreground text-sm hover:underline">
        ← All invoices
      </Link>

      <section>
        <h2 className="font-medium text-sm">Line items</h2>
        {invoice.lineItems.length === 0 ? (
          <p className="mt-2 text-muted-foreground text-sm">No line items.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {invoice.lineItems.map((li) => (
              <li key={li.id} className="flex justify-between text-sm">
                <span>
                  {li.description} ×{li.quantity}
                </span>
                <span>
                  {invoice.currencyCode} {li.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-medium text-sm">Payment history</h2>
        {invoice.payments.length === 0 ? (
          <p className="mt-2 text-muted-foreground text-sm">No payments submitted yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {invoice.payments.map((p) => (
              <li key={p.id}>
                {p.currencyCode} {p.amount} · {p.statusCode} · {new Date(p.occurredAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-medium text-sm">Reconciliation</h2>
        {invoice.reconciliationLog.length === 0 ? (
          <p className="mt-2 text-muted-foreground text-sm">Awaiting Buffr review of any POP you upload.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {invoice.reconciliationLog.map((r) => (
              <li key={r.id}>
                {r.decision}
                {r.note ? ` — ${r.note}` : ""} · {new Date(r.reconciledAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      {invoice.statusKey !== "paid" && invoice.statusKey !== "void" ? (
        <section>
          <h2 className="font-medium text-sm">{billingCopy.bankTransfer.heading}</h2>
          {bank?.complete ? (
            <dl className="mt-2 grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{billingCopy.bankTransfer.bank}</dt>
              <dd>{bank.bankName}</dd>
              <dt className="text-muted-foreground">{billingCopy.bankTransfer.accountName}</dt>
              <dd>{bank.accountName}</dd>
              <dt className="text-muted-foreground">{billingCopy.bankTransfer.accountNumber}</dt>
              <dd className="tabular-nums">{bank.accountNumber}</dd>
              <dt className="text-muted-foreground">{billingCopy.bankTransfer.branchCode}</dt>
              <dd className="tabular-nums">{bank.branchCode}</dd>
              <dt className="text-muted-foreground">{billingCopy.bankTransfer.reference}</dt>
              <dd className="font-medium">{invoice.invoiceNumber}</dd>
            </dl>
          ) : (
            <p className="mt-2 text-muted-foreground text-sm">{billingCopy.bankTransfer.incomplete}</p>
          )}
          {bank?.complete ? (
            <p className="mt-2 text-muted-foreground text-xs">{billingCopy.bankTransfer.referenceHint}</p>
          ) : null}
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 font-medium text-sm">Upload proof of payment</h2>
        <PopUploadForm invoiceId={invoice.id} amount={invoice.amount} />
      </section>
    </div>
  );
}
