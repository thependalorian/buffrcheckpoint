"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Lock, Mail } from "lucide-react";

import { TurnstileWidget, turnstileEnabled } from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { useBuffrIdConfig } from "@/lib/auth/use-buffr-id-config";
import { authCopy } from "@/lib/copy/auth";
import { AnalyticsEvents, track } from "@/lib/observability/track";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const buffrId = useBuffrIdConfig();
  const next = searchParams.get("next");
  const startHref = `/api/auth/buffr-id/start?intent=signin${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  const urlError = searchParams.get("error");
  // With Buffr ID on and password sign-in narrowed, the password form is only for kiosk operators: it is shown on request.
  const showPasswordForm = !buffrId.enabled || buffrId.legacyPassword === "on" || searchParams.get("password") === "1";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(turnstileToken ? { "x-turnstile-token": turnstileToken } : {}),
        },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (result.emailVerificationRequired) {
        const params = new URLSearchParams({ email });
        router.push(`/auth/check-email?${params.toString()}`);
        return;
      }
      if (result.mfaRequired && result.mfaChallengeToken) {
        track(AnalyticsEvents.loginMfaRequired);
        sessionStorage.setItem("buffr.mfaChallengeToken", result.mfaChallengeToken);
        const next = searchParams.get("next");
        if (next) sessionStorage.setItem("buffr.mfaNextPath", next);
        else sessionStorage.removeItem("buffr.mfaNextPath");
        router.push("/auth/mfa/challenge");
        return;
      }
      if (!response.ok) {
        track(AnalyticsEvents.loginFailed, { status: response.status });
        if (response.status === 429) {
          track(AnalyticsEvents.loginLockedOut);
          setError(result.error ?? authCopy.errors.lockedOut);
          return;
        }
        setError(result.error ?? authCopy.errors.generic);
        return;
      }
      track(AnalyticsEvents.loginSucceeded);
      const fallback = safeNextPath(searchParams.get("next") ?? result.nextPath ?? "/dashboard/overview");
      router.push(fallback);
      router.refresh();
    } finally {
      setSubmitting(false);
      setTurnstileReset((n) => n + 1);
    }
  }

  const buffrIdButton = buffrId.enabled ? (
    <div className="flex flex-col gap-3">
      {urlError && authCopy.buffrId.errors[urlError] ? (
        <p className="text-destructive text-sm">{authCopy.buffrId.errors[urlError]}</p>
      ) : null}
      <Button asChild className="w-full">
        <a href={startHref}>{authCopy.buffrId.continue}</a>
      </Button>
      {showPasswordForm && buffrId.legacyPassword === "on" ? (
        <p className="text-center text-muted-foreground text-xs">{authCopy.buffrId.or}</p>
      ) : null}
    </div>
  ) : null;

  if (buffrId.enabled && !showPasswordForm) {
    return (
      <div className="flex flex-col gap-4">
        {buffrIdButton}
        <p className="text-center text-muted-foreground text-sm">
          {authCopy.login.noAccount}{" "}
          <Link href="/auth/register" className="text-sodium-yellow-ink underline-offset-4 hover:underline">
            {authCopy.login.createOne}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {buffrIdButton}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileReset} />
      {error ? (
        <div className="space-y-1">
          <p className="text-destructive text-sm">{error}</p>
          <p className="text-muted-foreground text-xs">{authCopy.errors.signInHint}</p>
        </div>
      ) : null}
      <Button type="submit" disabled={submitting || (turnstileEnabled && !turnstileToken)} className="w-full">
        {submitting ? authCopy.login.submitting : authCopy.login.submit}
      </Button>
      <p className="text-center text-sm">
        <Link href="/auth/forgot-password" className="text-sodium-yellow-ink underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </p>
      <p className="text-center text-muted-foreground text-sm">
        {authCopy.login.noAccount}{" "}
        <Link href="/auth/register" className="text-sodium-yellow-ink underline-offset-4 hover:underline">
          {authCopy.login.createOne}
        </Link>
      </p>
    </form>
  );
}
