"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrganisationSector } from "@/lib/sectors";

import { updateOrganisationAction } from "../actions";

const TIMEZONES = ["Africa/Windhoek", "Africa/Johannesburg", "UTC"];

export function OrganisationProfileForm({
  legalName,
  tradingName,
  defaultTimezone,
  sectorCode,
  sectors,
}: {
  legalName: string;
  tradingName: string;
  defaultTimezone: string;
  sectorCode: string | null;
  sectors: OrganisationSector[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="max-w-lg space-y-4 rounded-lg border p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSaved(false);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await updateOrganisationAction({
              legalName: String(formData.get("legalName") ?? ""),
              tradingName: String(formData.get("tradingName") ?? ""),
              defaultTimezone: String(formData.get("defaultTimezone") ?? ""),
              sectorCode: String(formData.get("sectorCode") ?? ""),
            });
            setSaved(true);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save organisation.");
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="legalName">Legal name</Label>
        <Input id="legalName" name="legalName" defaultValue={legalName} required minLength={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tradingName">Trading name</Label>
        <Input id="tradingName" name="tradingName" defaultValue={tradingName} minLength={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="defaultTimezone">Timezone</Label>
        <select
          id="defaultTimezone"
          name="defaultTimezone"
          defaultValue={defaultTimezone || "Africa/Windhoek"}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sectorCode">Sector</Label>
        <select
          id="sectorCode"
          name="sectorCode"
          defaultValue={sectorCode ?? "other"}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {sectors.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save organisation"}
      </Button>
    </form>
  );
}
