import {
  CreatePrivacyNoticeSheet,
  CreateRetentionSheet,
} from "@/app/(main)/dashboard/_components/policy-create-sheets";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

interface RetentionPolicyRow {
  id: string;
  siteId: string | null;
  retentionDays: number;
  version: number;
}

export default async function RetentionPoliciesPage() {
  let policies: RetentionPolicyRow[] = [];
  let sites: Array<{ id: string; name: string }> = [];
  let error: string | null = null;
  try {
    [policies, sites] = await Promise.all([
      api.get<RetentionPolicyRow[]>("/retention-policy"),
      api.get<Array<{ id: string; name: string }>>("/sites"),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load retention policies.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Retention Policies"
        description="Retention schedules, privacy notices, legal holds, and deletion outcomes."
        action={
          <div className="flex flex-wrap gap-2">
            <CreateRetentionSheet sites={sites} />
            <CreatePrivacyNoticeSheet />
          </div>
        }
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Scope</TableHead>
                <TableHead className="h-11 p-3 font-medium">Retention (days)</TableHead>
                <TableHead className="h-11 p-3 font-medium">Version</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.length === 0 ? (
                <TableEmptyRow
                  colSpan={3}
                  title="No retention policy configured yet"
                  description="Set an organisation default or per-site override to start the retention clock."
                />
              ) : (
                policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="p-3 font-medium">
                      {policy.siteId ? `Site ${policy.siteId}` : "Organisation default"}
                    </TableCell>
                    <TableCell className="p-3">{policy.retentionDays}</TableCell>
                    <TableCell className="p-3">v{policy.version}</TableCell>
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
