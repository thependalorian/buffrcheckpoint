"use client";

import { useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authCopy } from "@/lib/copy/auth";

export function CheckEmailForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleResend(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(result.error ?? authCopy.errors.generic);
        return;
      }
      setMessage(authCopy.checkEmail.resent);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleResend} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {message ? <p className="text-muted-foreground text-sm">{message}</p> : null}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? authCopy.checkEmail.resending : authCopy.checkEmail.resend}
      </Button>
      <p className="text-center text-muted-foreground text-sm">
        <Link href="/auth/login" className="text-sodium-yellow-ink underline-offset-4 hover:underline">
          {authCopy.checkEmail.backToSignIn}
        </Link>
      </p>
    </form>
  );
}
