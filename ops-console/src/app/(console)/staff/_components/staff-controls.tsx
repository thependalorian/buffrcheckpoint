"use client";

import { useActionState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusSelect } from "@/components/ui/status-select";

import { deactivateStaffAction, inviteStaffAction, resendInvitationAction, setStaffRoleAction } from "../actions";

// Mirrors ASSIGNABLE_ROLE_CODES in platform-staff.service.ts. Keeping the list
// this short is the point: this screen runs Buffr's internal staff, not
// customer roles.
const STAFF_ROLES = ["platform_support", "compliance_audit_officer"];

export function InviteStaffForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; message?: string }, formData: FormData) => inviteStaffAction(formData),
    {},
  );

  return (
    <CardForm action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input name="email" type="email" placeholder="name@buffr.ai" required />
        <NativeSelect name="roleCode" defaultValue="platform_support">
          {STAFF_ROLES.map((role) => (
            <option key={role} value={role}>
              {role.replaceAll("_", " ")}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send invitation"}
        </Button>
      </div>
      {state?.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
      {state?.message ? <p className="text-muted-foreground text-xs">{state.message}</p> : null}
    </CardForm>
  );
}

export function StaffRowControls({
  userId,
  passwordSet,
  isSelf,
}: {
  userId: string;
  passwordSet: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();

  // A staff member cannot re-role or deactivate their own account — the last
  // administrator locking themselves out of the console has no in-product
  // recovery path. The backend refuses it too; this just stops the attempt.
  if (isSelf) {
    return <span className="text-muted-foreground text-xs">Your account</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {passwordSet ? null : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(() => void resendInvitationAction(userId))}
        >
          {pending ? "Working…" : "Resend invite"}
        </Button>
      )}
      <StatusSelect
        options={STAFF_ROLES.map((role) => ({ value: role, label: role.replaceAll("_", " ") }))}
        placeholder="Change role…"
        onChange={(next) => setStaffRoleAction(userId, next)}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => void deactivateStaffAction(userId))}
      >
        Deactivate
      </Button>
    </div>
  );
}
