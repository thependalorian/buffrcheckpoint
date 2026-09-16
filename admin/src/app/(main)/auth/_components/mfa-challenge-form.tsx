"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authCopy } from "@/lib/copy/auth";
import { AnalyticsEvents, track } from "@/lib/observability/track";

export function MfaChallengeForm() {
  const router = useRouter();
  const [hasClientToken, setHasClientToken] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setHasClientToken(Boolean(sessionStorage.getItem("buffr.mfaChallengeToken")));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Always re-read sessionStorage at submit time so a remount / second login
      // cannot leave a stale token in React state. Cookie fallback is on the BFF.
      const challengeToken = sessionStorage.getItem("buffr.mfaChallengeToken") ?? undefined;
      const response = await fetch("/api/auth/mfa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          useRecovery
            ? { challengeToken, recoveryCode: recoveryCode.trim() }
            : { challengeToken, code: code.replace(/[\s\-]/g, "") },
        ),
      });
      const result = await response.json();
      if (!response.ok) {
        track(AnalyticsEvents.mfaChallengeFailed, {
          status: response.status,
          used_recovery: useRecovery,
        });
        setError(typeof result.error === "string" ? result.error : authCopy.errors.generic);
        return;
      }
      track(AnalyticsEvents.mfaChallengeSucceeded, { used_recovery: useRecovery });
      sessionStorage.removeItem("buffr.mfaChallengeToken");
      router.push(result.nextPath ?? "/dashboard/default");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{authCopy.mfaChallenge.description}</p>
      <p className="text-muted-foreground text-xs">{authCopy.mfaChallenge.ttlHint}</p>
      {useRecovery ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recoveryCode">Recovery code</Label>
          <Input
            id="recoveryCode"
            required
            value={recoveryCode}
            onChange={(event) => setRecoveryCode(event.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Authenticator code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={6}
            maxLength={12}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/[^\d\s-]/g, ""))}
            placeholder="000000"
          />
        </div>
      )}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? authCopy.mfaChallenge.submitting : authCopy.mfaChallenge.submit}
      </Button>
      {!hasClientToken ? (
        <p className="text-center text-muted-foreground text-sm">
          {authCopy.mfaChallenge.missingToken}{" "}
          <Link href="/auth/login" className="text-sodium-yellow-ink underline-offset-4 hover:underline">
            {authCopy.mfaChallenge.backToSignIn}
          </Link>
        </p>
      ) : null}
      <button
        type="button"
        className="text-center text-muted-foreground text-sm underline-offset-4 hover:underline"
        onClick={() => setUseRecovery((value) => !value)}
      >
        {useRecovery ? authCopy.mfaChallenge.useTotp : authCopy.mfaChallenge.useRecovery}
      </button>
    </form>
  );
}
