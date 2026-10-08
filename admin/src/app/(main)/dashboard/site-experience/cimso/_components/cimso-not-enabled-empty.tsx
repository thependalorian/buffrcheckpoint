"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

interface CimsoNotEnabledEmptyProps {
  platformStatus: string;
  capabilitiesHref?: string;
}

export function CimsoNotEnabledEmpty({
  platformStatus,
  capabilitiesHref = "/dashboard/site-experience/capabilities",
}: CimsoNotEnabledEmptyProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-8 text-center">
      <p className="font-medium text-sm">CiMSO is not enabled for this organisation</p>
      <p className="text-muted-foreground text-sm">
        Platform status is <span className="capitalize">{platformStatus.replaceAll("_", " ")}</span>. Enable CiMSO
        INNterchange under Capability enablement, then return here to connect sites.
      </p>
      <Button asChild size="sm">
        <Link href={capabilitiesHref}>Open Capability enablement</Link>
      </Button>
    </div>
  );
}
