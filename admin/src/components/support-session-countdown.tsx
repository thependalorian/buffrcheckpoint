"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "expired";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Live-ticking countdown inside the persistent support-session banner — a
// static "expires at HH:MM" timestamp is easy to stop noticing; a number
// counting down is not. When it hits zero, every subsequent request under
// this session gets 403'd by RbacGuard's per-request grant re-check
// (rbac.guard.ts) regardless of what this client-side timer shows, so this
// is purely a UX affordance, not the enforcement point.
export function SupportSessionCountdown({ expiresAt }: { expiresAt: string }) {
  const target = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    const interval = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(interval);
  }, [target]);

  return <span className="font-mono">{formatRemaining(remaining)}</span>;
}
