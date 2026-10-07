import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { listSiteOptions } from "@/lib/sites/site-options";

import { EscalationSetupSheet } from "../_components/escalation-actions";

interface EscalationPolicyRow {
  id: string;
  policyName: string | null;
  siteId: string | null;
  visitorCategoryCode: string | null;
}

export default async function EscalationPage() {
  const sites = await listSiteOptions();
  let policies: EscalationPolicyRow[] = [];
  let error: string | null = null;
  try {
    policies = await api.get<EscalationPolicyRow[]>("/host-notification-escalation");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load escalation policies.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Host Escalation"
        description="Version-controlled wait times and escalation actions when hosts do not respond to arrival notifications."
        action={<EscalationSetupSheet sites={sites} />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Policy</TableHead>
                <TableHead className="h-11 p-3 font-medium">Site ID</TableHead>
                <TableHead className="h-11 p-3 font-medium">Visitor category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.length === 0 ? (
                <TableEmptyRow
                  colSpan={3}
                  title="No escalation policies yet"
                  description="Define org-wide or site-specific policies, publish versions, and the notification worker will evaluate them."
                />
              ) : (
                policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="p-3 font-medium">{policy.policyName ?? "Unnamed policy"}</TableCell>
                    <TableCell className="p-3 font-mono text-xs">{policy.siteId ?? "Organisation default"}</TableCell>
                    <TableCell className="p-3 font-mono text-xs">
                      {policy.visitorCategoryCode ?? "All categories"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
