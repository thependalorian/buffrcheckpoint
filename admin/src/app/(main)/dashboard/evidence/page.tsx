import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

import { GenerateEvidencePackButton } from "./_components/generate-evidence-pack-button";

interface EvidencePackRow {
  id: string;
  statusCode: string;
  generatedAt: string | null;
  fileReference: string | null;
}

export default async function EvidencePacksPage() {
  let packs: EvidencePackRow[] = [];
  let error: string | null = null;
  try {
    packs = await api.get<EvidencePackRow[]>("/evidence");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load evidence packs.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Evidence Packs"
        description="Audit and regulator evidence generation and controlled downloads."
        action={<GenerateEvidencePackButton />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Status</TableHead>
                <TableHead className="h-11 p-3 font-medium">Generated at</TableHead>
                <TableHead className="h-11 p-3 font-medium">File reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.length === 0 ? (
                <TableEmptyRow
                  colSpan={3}
                  title="No evidence packs generated yet"
                  description="A generated pack bundles the current RBAC matrix, retention-policy report, and audit-log extract (Section 20.2) into one exportable record. Use the button above to generate the first one."
                />
              ) : (
                packs.map((pack) => (
                  <TableRow key={pack.id}>
                    <TableCell className="p-3">
                      <Badge variant="secondary">{pack.statusCode}</Badge>
                    </TableCell>
                    <TableCell className="p-3">
                      {pack.generatedAt ? new Date(pack.generatedAt).toLocaleString() : "Pending"}
                    </TableCell>
                    <TableCell className="p-3 font-mono text-xs">{pack.fileReference ?? "—"}</TableCell>
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
