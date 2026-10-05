import { CreateLegalHoldSheet, ReleaseLegalHoldButton } from "./_components/legal-hold-controls";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

interface LegalHoldRow {
  id: string;
  organisationId: string;
  scope: Record<string, unknown>;
  active: boolean;
  createdAt?: string;
}

export default async function LegalHoldsPage() {
  let rows: LegalHoldRow[] = [];
  let error: string | null = null;
  try {
    rows = await api.get<LegalHoldRow[]>("/legal-holds");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load legal holds.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Legal Holds"
        description="Active holds block retention and deletion for the scoped records until released."
        action={<CreateLegalHoldSheet />}
      />

      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Status</TableHead>
                <TableHead className="h-11 p-3 font-medium">Scope</TableHead>
                <TableHead className="h-11 p-3 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmptyRow
                  colSpan={3}
                  title="No legal holds"
                  description="Create a hold when litigation or investigation requires freezing deletion."
                />
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="p-3 text-sm">{row.active ? "Active" : "Released"}</TableCell>
                    <TableCell className="p-3 font-mono text-xs">{JSON.stringify(row.scope)}</TableCell>
                    <TableCell className="p-3">{row.active ? <ReleaseLegalHoldButton id={row.id} /> : "—"}</TableCell>
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
