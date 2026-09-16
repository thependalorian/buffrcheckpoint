"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { createHostAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function CreateHostSheet({
  sites,
  units = [],
}: {
  sites: Array<{ id: string; name: string }>;
  units?: Array<{ id: string; name: string; code: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" disabled={sites.length === 0}>
          Add host
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add host</SheetTitle>
          <SheetDescription>
            Hosts appear on the public check-in form and receive visitor notifications. Optionally link
            them to a directory unit (custom or BIAN-tagged).
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            const unitId = String(formData.get("organisationUnitId") ?? "");
            const selectedUnit = units.find((unit) => unit.id === unitId);
            startTransition(async () => {
              try {
                await createHostAction({
                  siteId: String(formData.get("siteId") ?? ""),
                  name: String(formData.get("name") ?? ""),
                  department: String(formData.get("department") ?? "") || selectedUnit?.name || "",
                  contactReference: String(formData.get("contactReference") ?? ""),
                  organisationUnitId: unitId || undefined,
                });
                setOpen(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create host.");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="siteId">Site</Label>
            <select
              id="siteId"
              name="siteId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              defaultValue={sites[0]?.id}
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" name="name" required minLength={2} placeholder="Reception Desk" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organisationUnitId">Directory unit (optional)</Label>
            <select
              id="organisationUnitId"
              name="organisationUnitId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              defaultValue=""
            >
              <option value="">None — free-text department only</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department label (optional)</Label>
            <Input id="department" name="department" placeholder="Front Desk" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactReference">Notification email (optional)</Label>
            <Input id="contactReference" name="contactReference" type="email" placeholder="host@example.com" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isPending || sites.length === 0} className="w-full">
            {isPending ? "Saving…" : "Create host"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
