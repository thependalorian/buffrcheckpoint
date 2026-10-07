import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { listSiteOptions } from "@/lib/sites/site-options";

import { PrintableQrPanel } from "../_components/printable-qr-panel";
import { QrRotateButton, QrSetupSheet } from "../_components/qr-actions";

interface SiteQrRow {
  id: string;
  label: string | null;
  siteId: string;
  qrTypeCode: string;
  qrTypeLabel?: string;
  /** The URL printed in the QR code, built by the backend for this type. Null for a type with no public page. */
  payload: string | null;
}

export default async function SiteQrPage() {
  const sites = await listSiteOptions();
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
        action={<QrSetupSheet sites={sites} />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {references
              .filter((row) => row.payload)
              .map((row) => (
                <PrintableQrPanel
                  key={`print-${row.id}`}
                  referenceId={row.id}
                  label={row.label ?? "Unlabelled reference"}
                  typeLabel={row.qrTypeLabel}
                  url={row.payload as string}
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
                    description="Add a QR code, then print it or copy its link. Publish the text for emergency and induction codes under Site Notices."
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
