import type { Metadata } from "next";

import { CheckInForm } from "./check-in-form";
import { CheckInShell } from "./check-in-shell";
import { InvitationCheckInForm } from "./invitation-check-in-form";

export const metadata: Metadata = {
  title: "Visitor check-in",
  description: "Check in as a visitor using your phone.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ site?: string; ref?: string; inv?: string; lang?: string }>;

/** Neutral container: the page frame is CheckInShell, Checkpoint's own header and footer. */
export default async function CheckInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const siteId = params.site?.trim() ?? "";
  const referenceId = params.ref?.trim() ?? "";
  const invitationToken = params.inv?.trim() ?? "";
  const initialLanguageCode = params.lang?.trim() || "en";
  const hasSiteQrParams = Boolean(siteId && referenceId);
  const hasInvitationToken = Boolean(invitationToken);

  if (hasInvitationToken) {
    return <InvitationCheckInForm invitationToken={invitationToken} />;
  }

  if (hasSiteQrParams) {
    return <CheckInForm siteId={siteId} referenceId={referenceId} initialLanguageCode={initialLanguageCode} />;
  }

  return (
    <CheckInShell>
      <div className="space-y-3">
        <h1 className="bc-h-page">Missing check-in link</h1>
        <p className="text-sm text-muted-foreground">
          Ask reception for a fresh check-in QR, or scan the printed public site QR for this location.
        </p>
      </div>
    </CheckInShell>
  );
}
