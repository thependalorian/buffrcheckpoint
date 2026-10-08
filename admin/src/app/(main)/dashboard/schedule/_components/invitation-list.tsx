"use client";

import { useState } from "react";

import { EmptyActionLink, TableEmptyRow } from "@/components/dashboard-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { revokeInvitationAction } from "../actions";

export interface ScheduleInvitationRow {
  id: string;
  siteId: string;
  hostId: string;
  visitorReference: string;
  expectedFrom: string | null;
  expectedUntil: string | null;
  statusCode: string;
  revokedAt: string | null;
}

interface InvitationListProps {
  invitations: ScheduleInvitationRow[];
  siteNameById: Record<string, string>;
}

export function InvitationList({ invitations, siteNameById }: InvitationListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke(invitationId: string) {
    setPendingId(invitationId);
    setError(null);
    try {
      await revokeInvitationAction(invitationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invitation.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/15">
            <TableRow>
              <TableHead className="h-11 p-3 font-medium">Visitor reference</TableHead>
              <TableHead className="h-11 p-3 font-medium">Site</TableHead>
              <TableHead className="h-11 p-3 font-medium">Valid until</TableHead>
              <TableHead className="h-11 p-3 font-medium">Status</TableHead>
              <TableHead className="h-11 p-3 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.length === 0 ? (
              <TableEmptyRow
                colSpan={5}
                title="No invitations yet"
                action={<EmptyActionLink href="/dashboard/hosts">Add a host</EmptyActionLink>}
                description="Create an invitation to pre-register an expected visitor."
              />
            ) : (
              invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="p-3 font-medium">{invitation.visitorReference}</TableCell>
                  <TableCell className="p-3">{siteNameById[invitation.siteId] ?? invitation.siteId}</TableCell>
                  <TableCell className="p-3">
                    {invitation.expectedUntil ? new Date(invitation.expectedUntil).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="p-3 capitalize">
                    {invitation.revokedAt ? "revoked" : invitation.statusCode.replaceAll("_", " ")}
                  </TableCell>
                  <TableCell className="p-3">
                    {!invitation.revokedAt && invitation.statusCode !== "matched" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pendingId === invitation.id}
                        onClick={() => handleRevoke(invitation.id)}
                      >
                        {pendingId === invitation.id ? "Revoking…" : "Revoke"}
                      </Button>
                    ) : (
                      "—"
                    )}
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
