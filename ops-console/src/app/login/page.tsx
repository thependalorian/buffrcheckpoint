"use client";

import { useActionState } from "react";

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-light">Platform Ops Console</CardTitle>
          <CardDescription>
            Buffr internal only. Sign in with a <span className="font-medium">platform_support</span> account — customer
            admin logins cannot use this console.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </main>
  );
}
