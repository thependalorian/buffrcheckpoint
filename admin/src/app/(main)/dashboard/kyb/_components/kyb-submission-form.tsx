"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { submitKybAction } from "../actions";

// Customer-facing KYB submission — business-identity verification at
// onboarding (backend/src/modules/kyb/kyb.service.ts submit()). Platform
// Ops Console reviews/decides from there; this form only submits.
export function KybSubmissionForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => submitKybAction(formData),
    {},
  );

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="businessRegistrationNumber">Business registration number</Label>
        <Input id="businessRegistrationNumber" name="businessRegistrationNumber" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="registeredBusinessName">Registered business name</Label>
        <Input id="registeredBusinessName" name="registeredBusinessName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="registeredAddress">Registered address</Label>
        <Input id="registeredAddress" name="registeredAddress" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="authorizedSignatoryName">Authorized signatory name</Label>
        <Input id="authorizedSignatoryName" name="authorizedSignatoryName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">Registration document</Label>
        <Input id="file" type="file" name="file" accept="application/pdf,image/*" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit for verification"}
      </Button>
      {state?.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
    </form>
  );
}
