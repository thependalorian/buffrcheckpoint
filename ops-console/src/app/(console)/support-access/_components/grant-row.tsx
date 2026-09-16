"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { mintSessionAction, revokeGrantAction } from "../actions";

const ADMIN_APP_URL = process.env.NEXT_PUBLIC_ADMIN_APP_URL ?? "http://localhost:3000";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending_customer_approval: { label: "Awaiting customer approval", className: "text-sodium-yellow-ink" },
  active: { label: "Active", className: "text-status-live" },
  denied: { label: "Denied", className: "text-destructive" },
  expired: { label: "Expired", className: "text-slate" },
  revoked: { label: "Revoked", className: "text-slate" },
};

export interface Grant {
  id: string;
  organisationId: string;
  status: string;
  expiresAt: string | null;
  denialReason: string | null;
}

export function GrantRow({ grant }: { grant: Grant }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status = STATUS_LABEL[grant.status] ?? { label: grant.status, className: "text-slate" };

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-foreground text-sm">Org {grant.organisationId}</p>
        <p className={`font-medium text-xs ${status.className}`}>
          {status.label}
          {grant.expiresAt && grant.status === "active"
            ? ` · expires ${new Date(grant.expiresAt).toLocaleString()}`
            : ""}
        </p>
        {grant.denialReason ? <p className="text-slate text-xs">Reason: {grant.denialReason}</p> : null}
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
      <div className="flex gap-2">
        {grant.status === "active" ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const session = await mintSessionAction(grant.id);
                  window.open(
                    `${ADMIN_APP_URL}/support-session?token=${encodeURIComponent(session.accessToken)}`,
                    "_blank",
                  );
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to mint session");
                }
              })
            }
          >
            Open in admin
          </Button>
        ) : null}
        {grant.status === "pending_customer_approval" || grant.status === "active" ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => startTransition(() => revokeGrantAction(grant.id))}
          >
            {grant.status === "pending_customer_approval" ? "Cancel request" : "Revoke"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
