"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authCopy } from "@/lib/copy/auth";
import { AnalyticsEvents, track } from "@/lib/observability/track";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const fallback = safeNextPath(
        searchParams.get("next") ?? result.nextPath ?? "/dashboard/overview",
      );
      router.push(fallback);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={submitting} className="w-full">
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
