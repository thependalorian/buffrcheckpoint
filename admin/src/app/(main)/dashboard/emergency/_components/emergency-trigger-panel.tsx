"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { triggerEmergencyAction } from "@/app/(main)/dashboard/_actions/visit-ops";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EmergencyTriggerPanel({ sites }: { sites: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-end">
      <div className="min-w-56 flex-1 space-y-2">
        <Label>Site</Label>
        <Select value={siteId} onValueChange={setSiteId}>
          <SelectTrigger>
            <SelectValue placeholder="Select site" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="destructive"
        disabled={pending || !siteId}
        onClick={() => {
          if (!window.confirm("Trigger emergency roll-call snapshot for this site?")) return;
          setError(null);
          setOk(null);
          startTransition(async () => {
            try {
              await triggerEmergencyAction(siteId);
              setOk("Emergency snapshot captured.");
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Trigger failed");
            }
          });
        }}
      >
        {pending ? "Triggering…" : "Trigger emergency"}
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {ok ? <p className="text-sm bc-text-success">{ok}</p> : null}
    </div>
  );
}
