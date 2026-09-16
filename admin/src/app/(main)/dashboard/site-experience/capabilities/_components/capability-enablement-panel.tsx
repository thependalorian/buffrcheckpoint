"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { updateOrganisationCapabilityAction } from "../actions";

interface CapabilityRow {
  code: string;
  label: string;
  platformStatus: string;
  orgEnabled: boolean;
}

interface CapabilityEnablementPanelProps {
  capabilities: CapabilityRow[];
}

export function CapabilityEnablementPanel({ capabilities }: CapabilityEnablementPanelProps) {
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleCapability(code: string, enabled: boolean) {
    setPendingCode(code);
    setError(null);
    try {
      await updateOrganisationCapabilityAction({ capabilityCode: code, enabled });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update capability.");
    } finally {
      setPendingCode(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/15">
            <TableRow>
              <TableHead className="h-11 p-3 font-medium">Capability</TableHead>
              <TableHead className="h-11 p-3 font-medium">Platform status</TableHead>
              <TableHead className="h-11 p-3 font-medium">Organisation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {capabilities.map((capability) => (
              <TableRow key={capability.code}>
                <TableCell className="p-3 font-medium">{capability.label}</TableCell>
                <TableCell className="p-3 capitalize">{capability.platformStatus.replaceAll("_", " ")}</TableCell>
                <TableCell className="p-3">
                  {capability.platformStatus === "live" ? (
                    <Button
                      type="button"
                      variant={capability.orgEnabled ? "default" : "outline"}
                      size="sm"
                      disabled={pendingCode === capability.code}
                      onClick={() => toggleCapability(capability.code, !capability.orgEnabled)}
                    >
                      {pendingCode === capability.code
                        ? "Saving…"
                        : capability.orgEnabled
                          ? "Enabled"
                          : "Enable for organisation"}
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not available at platform level</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
