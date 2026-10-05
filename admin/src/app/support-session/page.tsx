import { redirect } from "next/navigation";

import { setSessionCookie } from "@/lib/auth/session";

// Entry point for a Platform Ops Console break-glass support session — the
// console mints a short-lived JWT scoped to one target org
// (backend/src/modules/support-sessions/support-sessions.service.ts)
// and deep-links here with it. This route just adopts that token as the
// admin/ session cookie and hands off to the normal dashboard — every
// existing screen renders unmodified from here (support-sessions.service.ts's
// whole point is reusing admin/'s screens, not rebuilding them).
// SupportSessionBanner (root layout) reads /auth/me's supportSession field
// to show the persistent "acting on behalf of" banner from here on.
export default async function SupportSessionPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    redirect("/auth/login");
  }

  await setSessionCookie(token);
  redirect("/dashboard/overview");
}
