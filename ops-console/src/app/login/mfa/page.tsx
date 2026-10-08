"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { mfaChallengeAction } from "../actions";

export default function MfaChallengePage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => mfaChallengeAction(formData),
    {},
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-light">Authenticator code</CardTitle>
          <CardDescription>Finish signing in to the Platform Ops Console.</CardDescription>
        </CardHeader>
        <CardContent>
          <CardForm action={formAction} className="space-y-4 border-0 p-0">
            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recoveryCode">Or recovery code</Label>
              <Input id="recoveryCode" name="recoveryCode" autoComplete="off" />
            </div>
            {state?.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Verifying…" : "Verify"}
            </Button>
          </CardForm>
        </CardContent>
      </Card>
    </main>
  );
}
