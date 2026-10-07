"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => loginAction(formData),
    {},
  );

  const [buffrId, setBuffrId] = useState<{ enabled: boolean; legacyPassword: string }>({ enabled: false, legacyPassword: "on" });
  useEffect(() => {
    fetch("/api/auth/buffr-id/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setBuffrId({ enabled: b.enabled === true, legacyPassword: b.legacyPassword ?? "on" }))
      .catch(() => undefined);
  }, []);
  const urlError = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("error");
  const errorText: Record<string, string> = {
    buffr_id_unavailable: "Buffr ID sign-in is not available right now.",
    buffr_id_state: "That sign-in expired. Start again.",
    buffr_id_denied: "Buffr ID sign-in was cancelled.",
    buffr_id_token: "Buffr ID could not confirm your sign-in.",
    buffr_id_two_step: "Platform staff need two-step sign-in. Turn it on in Buffr ID, then sign in again.",
    buffr_id_failed: "That Buffr ID is not a platform staff account.",
  };
  const passwordOpen = !buffrId.enabled || buffrId.legacyPassword === "on";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-2 inline-flex items-center gap-3">
            <Image src="/icon.png" alt="" width={96} height={96} className="size-11 rounded-lg" priority />
            <span className="font-heading font-semibold text-2xl tracking-tight">Checkpoint</span>
          </span>
          <CardTitle className="font-heading text-2xl font-light">Platform Ops Console</CardTitle>
          <CardDescription>
            Buffr internal only. Sign in with a <span className="font-medium">platform_support</span> account — customer
            admin logins cannot use this console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {buffrId.enabled ? (
            <div className="mb-4 space-y-3">
              {urlError && errorText[urlError] ? <p className="text-destructive text-sm">{errorText[urlError]}</p> : null}
              <Button asChild className="w-full">
                <a href="/api/auth/buffr-id/start">Continue with Buffr ID</a>
              </Button>
            </div>
          ) : null}
          {passwordOpen ? (
          <CardForm action={formAction} className="space-y-4 p-0 ring-0">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {state?.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </CardForm>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
