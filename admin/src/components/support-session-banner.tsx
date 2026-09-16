import { getCurrentUser } from "@/lib/auth/me";
import { SupportSessionCountdown } from "@/components/support-session-countdown";

// Persistent, non-dismissable — never a silent "acting as" state. Shows on
// every page while a Platform Ops Console break-glass support session is
// active (see auth.service.ts's me() support-session branch and
// app/support-session/page.tsx). Visibly different accent (destructive-
// adjacent border) so it's never confusable with a normal session.
export async function SupportSessionBanner() {
  const me = await getCurrentUser();
  if (!me?.supportSession) return null;

  return (
    <div className="flex w-full items-center justify-center gap-2 border-b-2 border-destructive bg-destructive/10 px-4 py-2 text-center text-sm font-medium text-destructive">
      <span>
        Acting on behalf of <span className="font-semibold">{me.activeOrganisation.name}</span> under a time-boxed,
        customer-approved support-access grant — every change here is separately audited.
      </span>
      {me.supportSession.expiresAt ? (
        <span className="rounded-full bg-destructive/15 px-2 py-0.5">
          <SupportSessionCountdown expiresAt={me.supportSession.expiresAt} />
        </span>
      ) : null}
    </div>
  );
}
