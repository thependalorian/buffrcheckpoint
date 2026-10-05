"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { activateDeviceAction } from "@/app/(main)/dashboard/_actions/policy-device-actions";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/actions/result";

export function ActivateDeviceButton({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          unwrap(await activateDeviceAction(deviceId));
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Activate"}
    </Button>
  );
}
