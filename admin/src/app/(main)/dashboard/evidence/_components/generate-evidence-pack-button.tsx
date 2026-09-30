"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { generateEvidencePack } from "./actions";

/** Date range is optional — omitted, the pack is the org-wide RBAC/retention/audit-log snapshot it always was; provided, it also bundles a visitor-access extract for that period, answering "produce evidence of who accessed the premises" for an auditor or regulator. */
export function GenerateEvidencePackButton() {
  const [isPending, startTransition] = useTransition();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Input
        type="date"
        aria-label="From date"
        className="h-8 w-36"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />
      <span className="text-muted-foreground text-xs">to</span>
      <Input type="date" aria-label="To date" className="h-8 w-36" value={to} onChange={(e) => setTo(e.target.value)} />
      <Button
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await generateEvidencePack({ from: from || undefined, to: to || undefined });
            router.refresh();
          })
        }
      >
        {isPending ? "Generating…" : "Generate Evidence Pack"}
      </Button>
    </div>
  );
}
