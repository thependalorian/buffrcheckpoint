"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { connectCimsoAction } from "../actions";

interface SiteOption {
  id: string;
  name: string;
}

interface HostOption {
  id: string;
  siteId: string;
  displayName: string;
  active: boolean;
}

interface CimsoConnectSheetProps {
  sites: SiteOption[];
  hosts: HostOption[];
}

export function CimsoConnectSheet({ sites, hosts }: CimsoConnectSheetProps) {
  const [open, setOpen] = useState(false);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [siteExternalId, setSiteExternalId] = useState("");
  const [tcpHost, setTcpHost] = useState("");
  const [tcpPort, setTcpPort] = useState("9443");
  const [tlsEnabled, setTlsEnabled] = useState(true);
  const [clientLoginId, setClientLoginId] = useState("");
  const [credentialsSecretRef, setCredentialsSecretRef] = useState("");
  const [defaultHostId, setDefaultHostId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const siteHosts = useMemo(
    () => hosts.filter((h) => h.siteId === siteId && h.active),
    [hosts, siteId],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">Connect site</Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Connect CiMSO site</SheetTitle>
          <SheetDescription>
            Per-site TCP settings for INNterchange. Interface types 1, 3, and 4. Password stays in
            Railway under the secret ref name.
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            if (!siteId) {
              setError("Select a site.");
              return;
            }
            const port = Number(tcpPort);
            startTransition(async () => {
              try {
                await connectCimsoAction({
                  siteId,
                  siteExternalId: siteExternalId || undefined,
                  enabledInterfaceTypes: [1, 3, 4],
                  tcpHost: tcpHost || undefined,
                  tcpPort: Number.isFinite(port) && port > 0 ? port : undefined,
                  tlsEnabled,
                  clientLoginId: clientLoginId || undefined,
                  credentialsSecretRef: credentialsSecretRef || undefined,
                  defaultHostId: defaultHostId || undefined,
                });
                setOpen(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Connect failed.");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="cimso-site">Site</Label>
            <NativeSelect
              id="cimso-site"
              value={siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                setDefaultHostId("");
              }}
            >
              <option value="">Select site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cimso-external">CiMSO property / site external id</Label>
            <Input
              id="cimso-external"
              value={siteExternalId}
              onChange={(e) => setSiteExternalId(e.target.value)}
              placeholder="Property id from CiMSO"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cimso-host">TCP host</Label>
            <Input
              id="cimso-host"
              value={tcpHost}
              onChange={(e) => setTcpHost(e.target.value)}
              placeholder="innterchange.example.local"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cimso-port">TCP port</Label>
            <Input
              id="cimso-port"
              type="number"
              value={tcpPort}
              onChange={(e) => setTcpPort(e.target.value)}
              placeholder="9443"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="cimso-tls"
              type="checkbox"
              className="size-4"
              checked={tlsEnabled}
              onChange={(e) => setTlsEnabled(e.target.checked)}
            />
            <Label htmlFor="cimso-tls">TLS enabled</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cimso-login">Client login id</Label>
            <Input
              id="cimso-login"
              value={clientLoginId}
              onChange={(e) => setClientLoginId(e.target.value)}
              placeholder="INNterchange login id"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cimso-secret-ref">Credentials secret ref</Label>
            <Input
              id="cimso-secret-ref"
              value={credentialsSecretRef}
              onChange={(e) => setCredentialsSecretRef(e.target.value)}
              placeholder="CIMSO_SITE_DEMO_CLIENT_PASSWORD"
            />
            <p className="text-muted-foreground text-xs">
              Name of the Railway env var that holds the password. Never paste the password here.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cimso-default-host">Default host (for synced invitations)</Label>
            <NativeSelect
              id="cimso-default-host"
              value={defaultHostId}
              onChange={(e) => setDefaultHostId(e.target.value)}
              disabled={!siteId}
            >
              <option value="">Select host</option>
              {siteHosts.map((host) => (
                <option key={host.id} value={host.id}>
                  {host.displayName}
                </option>
              ))}
            </NativeSelect>
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button type="submit" disabled={isPending || !siteId}>
            {isPending ? "Saving…" : "Save connection"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
