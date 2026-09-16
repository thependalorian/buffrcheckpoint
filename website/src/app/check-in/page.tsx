import type { Metadata } from "next";

import { CheckInForm } from "./check-in-form";
import { InvitationCheckInForm } from "./invitation-check-in-form";

export const metadata: Metadata = {
  title: "Visitor check-in",
  description: "Check in as a visitor using your phone.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ site?: string; ref?: string; inv?: string }>;

/**
 * Neutral container — organisation chrome (hero/logo/footer) is owned by
 * CheckInBrandedShell after context loads. Buffr Checkpoint product marks
 * only appear when no published branding exists.
 */
export default async function CheckInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const siteId = params.site?.trim() ?? "";
  const referenceId = params.ref?.trim() ?? "";
  const invitationToken = params.inv?.trim() ?? "";
  const hasSiteQrParams = Boolean(siteId && referenceId);
  const hasInvitationToken = Boolean(invitationToken);

  if (hasInvitationToken) {
    return <InvitationCheckInForm invitationToken={invitationToken} />;
  }

  if (hasSiteQrParams) {
    return <CheckInForm siteId={siteId} referenceId={referenceId} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Missing check-in link</h1>
          <p className="text-sm text-muted-foreground">
            Scan the QR code on the reception kiosk to open a valid check-in page for this site.
          </p>
        </div>
      </main>
    </div>
  );
}
