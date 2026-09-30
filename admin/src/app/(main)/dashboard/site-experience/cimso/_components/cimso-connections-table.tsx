"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyRow } from "@/components/dashboard-state";

import { syncCimsoReservationsAction } from "../actions";

interface ConnectionRow {
  id: string;
  siteId: string;
  siteName: string | null;
  statusCode: string;
  siteExternalId: string | null;
  enabledInterfaceTypes: number[];
  tcpHost: string | null;
  tcpPort: number | null;
  tlsEnabled: boolean;
  clientLoginId: string | null;
  credentialsSecretRef: string | null;
  defaultHostId: string | null;
  lastSyncAt: string | null;
  lastErrorCode: string | null;
  credentialsConfigured: boolean;
}

interface CimsoConnectionsTableProps {
  connections: ConnectionRow[];
}

export function CimsoConnectionsTable({ connections }: CimsoConnectionsTableProps) {
  const [pendingSiteId, setPendingSiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSync(siteId: string) {
    setPendingSiteId(siteId);
    setError(null);
    setMessage(null);
    try {
      const result = await syncCimsoReservationsAction({ siteId });
      setMessage(
        typeof result?.recordsApplied === "number"
          ? `Sync logged. Applied ${result.recordsApplied} invitation(s).`
          : "Reservation sync requested.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setPendingSiteId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {message ? <p className="text-muted-foreground text-sm">{message}</p> : null}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/15">
            <TableRow>
              <TableHead className="h-11 p-3 font-medium">Site</TableHead>
              <TableHead className="h-11 p-3 font-medium">Status</TableHead>
              <TableHead className="h-11 p-3 font-medium">TCP</TableHead>
              <TableHead className="h-11 p-3 font-medium">External id</TableHead>
              <TableHead className="h-11 p-3 font-medium">Last sync</TableHead>
              <TableHead className="h-11 p-3 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.length === 0 ? (
              <TableEmptyRow
                colSpan={6}
                title="No site connections yet"
                description="Use Connect site to store TCP settings and a default host for synced invitations."
              />
            ) : (
              connections.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="p-3 font-medium">{row.siteName ?? row.siteId}</TableCell>
                  <TableCell className="p-3 capitalize text-sm">
                    {row.statusCode.replaceAll("_", " ")}
                    {row.credentialsConfigured ? null : (
                      <span className="block text-muted-foreground text-xs">Secret not in env</span>
                    )}
                  </TableCell>
                  <TableCell className="p-3 font-mono text-xs">
                    {row.tcpHost ? `${row.tcpHost}:${row.tcpPort ?? "—"}` : "—"}
                    {row.tlsEnabled ? " (tls)" : ""}
                  </TableCell>
                  <TableCell className="p-3 font-mono text-xs">{row.siteExternalId ?? "—"}</TableCell>
                  <TableCell className="p-3 text-sm">
                    {row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString() : "—"}
                    {row.lastErrorCode ? (
                      <span className="block text-destructive text-xs">{row.lastErrorCode}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="p-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pendingSiteId !== null}
                      onClick={() => onSync(row.siteId)}
                    >
                      {pendingSiteId === row.siteId ? "Syncing…" : "Sync reservations"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
