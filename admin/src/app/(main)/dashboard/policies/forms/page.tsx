import Link from "next/link";

import { CreateFormSheet } from "@/app/(main)/dashboard/_components/policy-create-sheets";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, TableEmptyRow } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";

interface CheckInFormDefinitionRow {
  id: string;
  formName: string | null;
  siteId: string | null;
}

export default async function VisitorTypesFormsPage() {
  let forms: CheckInFormDefinitionRow[] = [];
  let sites: Array<{ id: string; name: string }> = [];
  let error: string | null = null;
  try {
    [forms, sites] = await Promise.all([
      api.get<CheckInFormDefinitionRow[]>("/visitor-policy/forms"),
      api.get<Array<{ id: string; name: string }>>("/sites"),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load visitor type forms.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Visitor Types & Forms"
        description="Risk-based form templates, field rules, and translations."
        action={<CreateFormSheet sites={sites} />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="h-11 p-3 font-medium">Form</TableHead>
                <TableHead className="h-11 p-3 font-medium">Scope</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.length === 0 ? (
                <TableEmptyRow
                  colSpan={2}
                  title="No visitor-type forms configured yet"
                  description="Every visitor category gets its own form definition with published fields."
                />
              ) : (
                forms.map((form) => (
                  <TableRow key={form.id} className="hover:bg-muted/30">
                    <TableCell className="p-3 font-medium">
                      <Link
                        href={`/dashboard/policies/forms/${form.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {form.formName ?? "Untitled form"}
                      </Link>
                    </TableCell>
                    <TableCell className="p-3">{form.siteId ? `Site ${form.siteId}` : "Organisation-wide"}</TableCell>
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
