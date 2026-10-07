import {
  CreateDsarSheet,
  DsarTypeFilter,
  ExtendDsarControl,
  RequestTypeBadge,
  ResolveDsarButtons,
} from "./_components/dsar-controls";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { type DeadlineState, deadlineClass, deadlineLabel, privacyRequestsCopy } from "@/lib/copy/privacy-requests";

interface DsarRow {
  id: string;
  subjectReference: string;
  requestTypeCode: string;
  statusCode: string;
  isAccountDeletion: boolean;
  createdAt?: string;
  exportFileReference?: string | null;
  dueAt: string | null;
  daysLeft: number | null;
  deadlineState: DeadlineState;
  extended: boolean;
  canExtend: boolean;
}

export default async function PrivacyRequestsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const typeFilter = params.type?.trim() || undefined;

  let rows: DsarRow[] = [];
  let error: string | null = null;
  try {
    const query = typeFilter ? `?requestTypeCode=${encodeURIComponent(typeFilter)}` : "";
    rows = await api.get<DsarRow[]>(`/dsar${query}`);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load privacy requests.";
  }

  const deletionCount = rows.filter((row) => row.isAccountDeletion && row.statusCode === "pending").length;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Privacy Requests (DSAR)"
        description="Data export, correction, and account-deletion requests. Account deletion is visually distinct and filterable for compliance prioritisation."
        action={<CreateDsarSheet />}
      />

      <DsarTypeFilter active={typeFilter ?? ""} />

      {typeFilter === "account_deletion" || deletionCount > 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {deletionCount} pending account-deletion request{deletionCount === 1 ? "" : "s"} in this view.
        </p>
      ) : null}

      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Type</TableHead>
                <TableHead className="h-11 p-3 font-medium">Subject</TableHead>
                <TableHead className="h-11 p-3 font-medium">Status</TableHead>
                <TableHead className="h-11 p-3 font-medium">{privacyRequestsCopy.dueColumn}</TableHead>
                <TableHead className="h-11 p-3 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmptyRow
                  colSpan={5}
                  title="No privacy requests yet"
                  description="Create a DSAR above. Filter to Account deletion when auditing erasure obligations."
                />
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className={row.isAccountDeletion ? "bg-amber-500/5" : undefined}>
                    <TableCell className="p-3">
                      <RequestTypeBadge code={row.requestTypeCode} isAccountDeletion={row.isAccountDeletion} />
                    </TableCell>
                    <TableCell className="p-3 font-mono text-xs">{row.subjectReference}</TableCell>
                    <TableCell className="p-3 text-sm">{row.statusCode}</TableCell>
                    <TableCell className="p-3 text-sm">
                      <div className="flex flex-col gap-2">
                        <span className={deadlineClass(row.deadlineState)}>
                          {deadlineLabel(row.deadlineState, row.daysLeft, row.dueAt)}
                        </span>
                        <ExtendDsarControl id={row.id} canExtend={row.canExtend} extended={row.extended} />
                      </div>
                    </TableCell>
                    <TableCell className="p-3">
                      <ResolveDsarButtons
                        id={row.id}
                        isAccountDeletion={row.isAccountDeletion}
                        statusCode={row.statusCode}
                      />
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
