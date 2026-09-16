"use client";

import { useTransition } from "react";

import { logoutAction } from "@/app/(console)/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
      className="w-full group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
    >
      {pending ? "…" : "Sign out"}
    </Button>
  );
}
