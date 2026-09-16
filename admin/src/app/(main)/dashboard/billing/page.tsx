import Link from "next/link";

import { PopUploadForm } from "./_components/pop-upload-form";
import { DashboardErrorState } from "@/components/dashboard-state";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { api } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/me";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  currencyCode: string;
  statusCode: string;
  issuedAt: string;
  dueAt: string | null;
}

// Customer-facing billing — the one place a customer touches billing at
// all. Subscription management and payment review stay platform-side (the
// Ops Console's /billing screen), per the manual EFT + POP model — see
// buffrcheckpoint.md Section 11.9.1a.
export default async function BillingPage() {
  const me = await getCurrentUser();
  if (!me) return null;

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
        description="Invoices are settled by bank transfer to Buffr Financial Services CC — upload your proof of payment against the invoice below once paid."
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : invoices.length === 0 ? (
        <p className="text-muted-foreground text-sm">No invoices yet.</p>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-xl border border-border p-4">
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
