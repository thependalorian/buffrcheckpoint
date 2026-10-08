import Link from "next/link";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, EmptyPanel } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/me";
import { billingCopy, type CardPaymentResult } from "@/lib/copy/billing";

import { PopUploadForm } from "./_components/pop-upload-form";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  currencyCode: string;
  statusCode: string;
  statusKey?: string | null;
  issuedAt: string;
  dueAt: string | null;
}

// Customer-facing billing — the one place a customer touches billing at
// all. Subscription management and payment review stay platform-side (the
// Ops Console's /billing screen), per the manual EFT + POP model — see
// buffrcheckpoint.md §11.2.
export default async function BillingPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const me = await getCurrentUser();
  if (!me) return null;
  const { payment } = await searchParams;
  const paymentResult =
    payment && payment in billingCopy.result ? billingCopy.result[payment as CardPaymentResult] : null;
  let cardEnabled = false;
  try {
    cardEnabled = (await api.get<{ enabled: boolean }>("/platform/billing/payments/card/enabled")).enabled;
  } catch {
    cardEnabled = false;
  }

  let invoices: Invoice[] = [];
  let error: string | null = null;
  try {
    invoices = await api.get<Invoice[]>(`/platform/billing/invoices?organisationId=${me.activeOrganisation.id}`);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load invoices.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Billing"
        description={cardEnabled ? billingCopy.descriptionWithCard : billingCopy.descriptionBankOnly}
      />
      {paymentResult ? (
        <p
          role="status"
          className={`rounded-xl border p-4 text-sm ${payment === "succeeded" ? "border-[var(--color-status-live)] text-foreground" : "border-border text-foreground"}`}
        >
          {paymentResult}
        </p>
      ) : null}
      {error ? (
        <DashboardErrorState message={error} />
      ) : invoices.length === 0 ? (
        <EmptyPanel title="No invoices yet" description="Your first invoice appears here once your plan is set up." />
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="bc-panel">
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/dashboard/billing/${invoice.id}`} className="font-medium hover:underline">
                    {invoice.invoiceNumber}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {invoice.currencyCode} {invoice.amount} · issued {new Date(invoice.issuedAt).toLocaleDateString()}
                    {invoice.dueAt ? ` · due ${new Date(invoice.dueAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
              </div>
              {cardEnabled && invoice.statusKey !== "paid" && invoice.statusKey !== "void" ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href={`/api/billing/card-payment/${invoice.id}`}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm"
                  >
                    {billingCopy.payByCard}
                  </a>
                  <span className="text-muted-foreground text-xs">{billingCopy.payByCardHint}</span>
                </div>
              ) : null}
              <div className="mt-3">
                <PopUploadForm invoiceId={invoice.id} amount={invoice.amount} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
