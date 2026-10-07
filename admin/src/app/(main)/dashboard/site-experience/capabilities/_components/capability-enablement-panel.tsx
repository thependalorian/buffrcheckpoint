"use client";

import { useState } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { updateOrganisationCapabilityAction } from "../actions";

interface CapabilityRow {
  code: string;
  label: string;
  platformStatus: string;
  orgEnabled: boolean;
  configureHref?: string;
}

interface CapabilityEnablementPanelProps {
  capabilities: CapabilityRow[];
}

function canOrgEnable(code: string, platformStatus: string): boolean {
  if (platformStatus === "live") return true;
  return code === "cimso_innterchange" && platformStatus === "targeted";
}

export function CapabilityEnablementPanel({ capabilities }: CapabilityEnablementPanelProps) {
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleCapability(code: string, enabled: boolean) {
    setPendingCode(code);
    setError(null);
    try {
      await updateOrganisationCapabilityAction({
        capabilityCode: code,
        enabled,
        configurationReference: code === "cimso_innterchange" && enabled ? "pms:cimso" : undefined,
      });
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
                  {canOrgEnable(capability.code, capability.platformStatus) ? (
                    <div className="flex flex-wrap items-center gap-2">
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
                      {capability.orgEnabled && capability.configureHref ? (
                        <Button asChild type="button" variant="outline" size="sm">
                          <Link href={capability.configureHref}>Configure</Link>
                        </Button>
                      ) : null}
                    </div>
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
