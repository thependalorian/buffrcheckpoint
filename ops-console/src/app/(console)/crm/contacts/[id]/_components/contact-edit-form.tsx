"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { updateContactAction } from "../../actions";

export function ContactEditForm({
  contactId,
  initial,
}: {
  contactId: string;
  initial: {
    name: string;
    email: string | null;
    phone: string | null;
    roleTitle: string | null;
    isPrimary: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<{ error?: string; ok?: boolean }, FormData>(
    async (_prev, formData) => {
      const result = await updateContactAction(contactId, formData);
      if (result.error) return { error: result.error };
      return { ok: true };
    },
    {},
  );

  return (
    <CardForm action={formAction} className="mt-6 max-w-lg space-y-3">
      <label className="block space-y-1">
        <span className="text-muted-foreground text-xs">Name</span>
        <Input name="name" defaultValue={initial.name} required />
      </label>
      <label className="block space-y-1">
        <span className="text-muted-foreground text-xs">Role / title</span>
        <Input name="roleTitle" defaultValue={initial.roleTitle ?? ""} />
      </label>
      <label className="block space-y-1">
        <span className="text-muted-foreground text-xs">Email</span>
        <Input name="email" type="email" defaultValue={initial.email ?? ""} />
      </label>
      <label className="block space-y-1">
        <span className="text-muted-foreground text-xs">Phone</span>
        <Input name="phone" defaultValue={initial.phone ?? ""} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="isPrimary" type="checkbox" defaultChecked={initial.isPrimary} className="size-4" />
        Primary contact
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save contact"}
      </Button>
      {state?.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
      {state?.ok ? <p className="text-muted-foreground text-xs">Saved.</p> : null}
    </CardForm>
  );
}
