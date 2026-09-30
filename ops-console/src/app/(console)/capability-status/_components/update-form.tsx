"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

import { updateCapabilityStatusAction } from "../actions";

const CAPABILITIES = [
  "diginam_verification",
  "national_eid_nfc",
  "nfc_badge_checkin",
  "ussd",
  "qr_invitation_checkin",
  "sms_contact_confirmation",
  "cimso_innterchange",
];

const STATUSES = [
  "discovery",
  "approved",
  "pilot",
  "live",
  "suspended",
  "targeted",
  "not_started",
  "partner_testing",
  "provider_testing",
];

export function UpdateForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => updateCapabilityStatusAction(formData),
    {},
  );

  return (
    <CardForm action={formAction}>
      <p className="font-medium text-foreground text-sm">Update capability status</p>
      <p className="mt-1 text-slate text-xs">
        Marking a capability &apos;live&apos; requires evidence and two distinct platform_support approvers — the first
        submission here records the first approval only; a second distinct user must submit the same
        capability/status/evidence again to finalize.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NativeSelect name="capabilityCode" required>
          {CAPABILITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" required>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="publicStatus" required>
          <option value="not_available">not_available</option>
          <option value="targeted">targeted</option>
          <option value="live">live</option>
        </NativeSelect>
        <Input name="evidenceReference" placeholder="Evidence reference" required />
      </div>
      <Button type="submit" disabled={pending} className="mt-3">
        {pending ? "Saving…" : "Submit"}
      </Button>
      {state?.error ? <p className="mt-2 text-destructive text-xs">{state.error}</p> : null}
    </CardForm>
  );
}
