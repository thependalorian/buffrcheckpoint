"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authCopy, PASSWORD_MIN_LENGTH, passwordRule } from "@/lib/copy/auth";
import { AnalyticsEvents, track } from "@/lib/observability/track";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const result = await response.json();
      if (!response.ok) {
        track(AnalyticsEvents.passwordResetFailed, { step: "confirm", status: response.status });
        setError(result.error ?? authCopy.errors.generic);
        return;
      }
      track(AnalyticsEvents.passwordResetConfirmed);
      router.push("/auth/login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{authCopy.resetPassword.description}</p>
      {!token ? <p className="text-destructive text-sm">{authCopy.resetPassword.missingToken}</p> : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <p className="text-muted-foreground text-xs">{passwordRule}</p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={submitting || !token}>
        {submitting ? authCopy.resetPassword.submitting : authCopy.resetPassword.submit}
      </Button>
      <Link
        href="/auth/login"
        className="text-center text-sodium-yellow-ink text-sm underline-offset-4 hover:underline"
      >
        {authCopy.forgotPassword.backToSignIn}
      </Link>
    </form>
  );
}
