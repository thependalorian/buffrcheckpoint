import { notFound } from "next/navigation";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

import { FormBuilder } from "./_components/form-builder";

type FormDefinition = {
  id: string;
  formName: string | null;
  siteId: string | null;
};

type FormVersion = {
  id: string;
  versionNumber: number;
  statusCode: string;
  approvalReference: string | null;
};

type FieldLibrary = {
  fieldCodes: Array<{ code: string; label: string }>;
  fieldTypes: Array<{ code: string; label: string }>;
  fieldClasses: Array<{ code: string; label: string }>;
  languages: Array<{ code: string; label: string }>;
};

export default async function FormBuilderPage({ params }: { params: Promise<{ definitionId: string }> }) {
  const { definitionId } = await params;
  let definition: FormDefinition | null = null;
  let versions: FormVersion[] = [];
  let library: FieldLibrary | null = null;
  let error: string | null = null;

  try {
    [definition, versions, library] = await Promise.all([
      api.get<FormDefinition>(`/visitor-policy/forms/${definitionId}`),
      api.get<FormVersion[]>(`/visitor-policy/forms/${definitionId}/versions`),
      api.get<FieldLibrary>("/visitor-policy/forms/field-library"),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load form builder.";
  }

  if (!error && !definition) notFound();

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={definition?.formName ?? "Form builder"}
        description="Add fields, set required and visibility rules, translate labels, then publish a draft."
      />
      {error || !definition || !library ? (
        <DashboardErrorState message={error ?? "Form not found"} />
      ) : (
        <FormBuilder definition={definition} initialVersions={versions} library={library} />
      )}
    </div>
  );
}
