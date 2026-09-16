"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { generateEvidencePack } from "./actions";

export function GenerateEvidencePackButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await generateEvidencePack();
          router.refresh();
        })
      }
    >
      {isPending ? "Generating…" : "Generate Evidence Pack"}
    </Button>
  );
}
