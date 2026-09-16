import {
  CreateAccessPolicySheet,
  CreatePrivacyNoticeSheet,
  CreateRetentionSheet,
} from "@/app/(main)/dashboard/_components/policy-create-sheets";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

interface AccessPolicyRow {
  id: string;
  siteId: string | null;
  zoneId: string | null;
  config: Record<string, unknown>;
}

export default async function AccessPoliciesPage() {
  let policies: AccessPolicyRow[] = [];
  let sites: Array<{ id: string; name: string }> = [];
  let error: string | null = null;
  try {
    [policies, sites] = await Promise.all([
      api.get<AccessPolicyRow[]>("/access-policies"),
      api.get<Array<{ id: string; name: string }>>("/sites"),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load access policies.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Access Policies"
        description="Site risk tiers, verification requirements, and host approval rules."
        action={<CreateAccessPolicySheet sites={sites} />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Scope</TableHead>
                <TableHead className="h-11 p-3 font-medium">Configuration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.length === 0 ? (
                <TableEmptyRow
                  colSpan={2}
                  title="No access policies configured yet"
                  description="Create a policy to require host approval or disable photo capture by default."
                />
              ) : (
                policies.map((policy) => {
                  let scope = "Organisation-wide";
                  if (policy.zoneId) scope = `Zone ${policy.zoneId}`;
                  else if (policy.siteId) scope = `Site ${policy.siteId}`;
                  return (
                    <TableRow key={policy.id}>
                      <TableCell className="p-3 font-medium">{scope}</TableCell>
                      <TableCell className="p-3 font-mono text-xs">{JSON.stringify(policy.config)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
