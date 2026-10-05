"use client";

import { useEffect, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { onboardingCopy } from "@/lib/copy/onboarding";

const REFRESH_MS = 45_000;

/**
 * Re-checks status quietly every 45 seconds; the proxy sends the user on to
 * their dashboard as soon as the organisation goes live.
 */
export function WaitingActions() {
  const router = useRouter();
  const copy = onboardingCopy.waiting;
  const [checking, startChecking] = useTransition();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button className="min-h-11" onClick={() => startChecking(() => router.refresh())} disabled={checking}>
        {checking ? copy.checking : copy.checkStatus}
      </Button>
      <Button variant="outline" className="min-h-11" onClick={signOut} disabled={signingOut}>
        {copy.signOut}
      </Button>
    </div>
  );
}
