"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { confirmMfaEnrollmentAction, startMfaEnrollmentAction } from "../actions";

// Staff accounts must enrol an authenticator before any ops session exists (buffrcheckpoint.md §9.2a).
export default function MfaSetupPage() {
  const [setup, setSetup] = useState<{ secret?: string; qr?: string; error?: string }>({});
  const [state, formAction, pending] = useActionState(
    async (_prev: { recoveryCodes?: string[]; error?: string }, formData: FormData) =>
      confirmMfaEnrollmentAction(formData),
    {},
  );

  useEffect(() => {
    void startMfaEnrollmentAction().then(async (result) => {
      if (result.error || !result.otpauthUrl) {
        setSetup({ error: result.error ?? "Could not start authenticator setup." });
        return;
      }
      const qr = await QRCode.toDataURL(result.otpauthUrl, { margin: 1, width: 220 }).catch(() => undefined);
      setSetup({ secret: result.secret, qr });
    });
  }, []);

  if (state?.recoveryCodes) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="font-heading text-2xl font-light">Save your recovery codes</CardTitle>
            <CardDescription>
              Each code signs you in once if you lose your authenticator. They are shown only now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted p-3 font-mono text-sm">
              {state.recoveryCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
            <Button asChild className="w-full">
              <Link href="/">I saved them, continue</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-light">Set up your authenticator</CardTitle>
          <CardDescription>
            The ops console requires an authenticator app. Scan the code, then enter the 6-digit code it shows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {setup.error ? (
            <p className="text-destructive text-sm">
              {setup.error}{" "}
              <Link href="/login" className="underline">
                Back to sign in
              </Link>
            </p>
          ) : null}
          {setup.qr ? (
            // biome-ignore lint/performance/noImgElement: data URL QR code, not an optimisable asset
            <img src={setup.qr} alt="Authenticator setup QR code" width={220} height={220} className="mx-auto rounded-md" />
          ) : null}
          {setup.secret ? (
            <p className="break-all text-center font-mono text-muted-foreground text-xs">{setup.secret}</p>
          ) : null}
          <CardForm action={formAction} className="space-y-4 p-0 ring-0">
            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" />
            </div>
            {state?.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
            <Button type="submit" disabled={pending || !setup.secret} className="w-full">
              {pending ? "Verifying…" : "Turn on MFA"}
            </Button>
          </CardForm>
        </CardContent>
      </Card>
    </main>
  );
}
