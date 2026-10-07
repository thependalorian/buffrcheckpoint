"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { createInvitationAction } from "../actions";
import { deliverySummary, invitationsCopy } from "@/lib/copy/invitations";

interface SiteOption {
  id: string;
  name: string;
}

interface HostOption {
  id: string;
  siteId: string;
  displayName: string;
}

interface CreateInvitationSheetProps {
  sites: SiteOption[];
  hosts: HostOption[];
}

export function CreateInvitationSheet({ sites, hosts }: CreateInvitationSheetProps) {
  const [open, setOpen] = useState(false);
  const [siteId, setSiteId] = useState("");
  const [hostId, setHostId] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const hostsForSite = useMemo(() => hosts.filter((host) => !siteId || host.siteId === siteId), [hosts, siteId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setQrUrl(null);
    setDelivery(null);
    try {
      const created = await createInvitationAction({
        siteId,
        hostId,
        visitorReference: String(formData.get("visitorReference") ?? ""),
        visitorCategoryCode: String(formData.get("visitorCategoryCode") ?? "general"),
        expiresAt: String(formData.get("expiresAt") ?? ""),
        visitorEmail: String(formData.get("visitorEmail") ?? ""),
        visitorMobile: String(formData.get("visitorMobile") ?? ""),
      });
      setQrUrl(created.qrUrl);
      setDelivery(deliverySummary(created));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invitation.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button">Create invitation</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create invitation</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteId">Site</Label>
            <Select
              value={siteId}
              onValueChange={(value) => {
                setSiteId(value);
                setHostId("");
              }}
              required
            >
              <SelectTrigger id="siteId">
                <SelectValue placeholder="Select a site" />
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
          <div className="space-y-2">
            <Label htmlFor="hostId">Host</Label>
            <Select value={hostId} onValueChange={setHostId} required disabled={!siteId}>
              <SelectTrigger id="hostId">
                <SelectValue placeholder={siteId ? "Select a host" : "Choose a site first"} />
              </SelectTrigger>
              <SelectContent>
                {hostsForSite.map((host) => (
                  <SelectItem key={host.id} value={host.id}>
                    {host.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="visitorReference">Visitor reference (internal, not printed on QR)</Label>
            <Textarea id="visitorReference" name="visitorReference" required rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visitorCategoryCode">Visitor category</Label>
            <Input id="visitorCategoryCode" name="visitorCategoryCode" defaultValue="general" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Valid until</Label>
            <Input id="expiresAt" name="expiresAt" type="datetime-local" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visitorEmail">{invitationsCopy.emailLabel}</Label>
            <Input id="visitorEmail" name="visitorEmail" type="email" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visitorMobile">{invitationsCopy.mobileLabel}</Label>
            <Input id="visitorMobile" name="visitorMobile" type="tel" autoComplete="off" />
            <p className="text-xs text-muted-foreground">{invitationsCopy.deliveryHint}</p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {delivery ? <p className="text-sm text-foreground">{delivery}</p> : null}
          {qrUrl ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Invitation QR URL (opaque token only)</p>
              <p className="mt-2 break-all font-mono text-xs">{qrUrl}</p>
            </div>
          ) : null}
          <Button type="submit" disabled={pending || !siteId || !hostId}>
            {pending ? "Creating…" : "Create"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
