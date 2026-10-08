"use client";

import { useState } from "react";

import Link from "next/link";

import { TurnstileWidget, turnstileEnabled } from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authCopy } from "@/lib/copy/auth";
import { AnalyticsEvents, track } from "@/lib/observability/track";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(turnstileToken ? { "x-turnstile-token": turnstileToken } : {}),
        },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) {
        track(AnalyticsEvents.passwordResetFailed, { step: "request", status: response.status });
        setError(result.error ?? authCopy.errors.generic);
        return;
      }
      track(AnalyticsEvents.passwordResetRequested);
      setMessage(authCopy.forgotPassword.sent);
    } finally {
      setSubmitting(false);
      setTurnstileReset((n) => n + 1);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileReset} />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {message ? <p className="bc-text-success text-sm">{message}</p> : null}
      <Button type="submit" disabled={submitting || (turnstileEnabled && !turnstileToken)}>
        {submitting ? authCopy.forgotPassword.submitting : authCopy.forgotPassword.submit}
      </Button>
      <Link
        href="/auth/login"
        className="text-center text-sm text-sodium-yellow-ink underline-offset-4 hover:underline"
      >
        {authCopy.forgotPassword.backToSignIn}
      </Link>
    </form>
  );
}
