import { QrRotateButton, QrSetupSheet } from "../_components/qr-actions";
import { PrintableQrPanel } from "../_components/printable-qr-panel";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

interface SiteQrRow {
  id: string;
  label: string | null;
  siteId: string;
  qrTypeCode: string;
  qrTypeLabel?: string;
}

export default async function SiteQrPage() {
  let references: SiteQrRow[] = [];
  let error: string | null = null;
  try {
    references = await api.get<SiteQrRow[]>("/site-qr-references");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load site QR references.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Site QR Codes"
        description="Typed QR references with printable check-in kits and append-only rotation history."
        action={<QrSetupSheet />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {references.map((row) => (
              <PrintableQrPanel
                key={`print-${row.id}`}
                siteId={row.siteId}
                referenceId={row.id}
                label={row.label ?? "Unlabelled reference"}
              />
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader className="bg-muted/15">
                <TableRow>
                  <TableHead className="h-11 p-3 font-medium">Label</TableHead>
                  <TableHead className="h-11 p-3 font-medium">Site ID</TableHead>
                  <TableHead className="h-11 p-3 font-medium">QR type</TableHead>
                  <TableHead className="h-11 p-3 font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {references.length === 0 ? (
                  <TableEmptyRow
                    colSpan={4}
                    title="No site QR references yet"
                    description="Create a public_site_checkin QR, then print or copy the check-in URL."
                  />
                ) : (
                  references.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="p-3 font-medium">{row.label ?? "Unlabelled reference"}</TableCell>
                      <TableCell className="p-3 font-mono text-xs">{row.siteId}</TableCell>
                      <TableCell className="p-3 text-sm">{row.qrTypeLabel ?? row.qrTypeCode}</TableCell>
                      <TableCell className="p-3">
                        <QrRotateButton referenceId={row.id} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
