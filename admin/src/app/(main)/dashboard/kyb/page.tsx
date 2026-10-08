import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/me";
import { kybCopy } from "@/lib/copy/kyb";

import { type KybRequestView, type KybSubmissionView, KybWorkspace } from "./_components/kyb-workspace";
import type { KybChecklistItem, KybDocumentView } from "./actions";

interface TypeDefinitionRow {
  id: string;
  code: string;
  label: string;
}

interface KybDetails {
  submission: KybSubmissionView | null;
  documents: KybDocumentView[];
  request: KybRequestView | null;
  checklist: KybChecklistItem[];
}

// Customer-facing business verification (KYB) at onboarding. It gates the subscription reaching 'active'
// (backend/src/modules/billing/billing.service.ts). Not ongoing sanctions or AML monitoring: see backend/src/db/schema/kyb.ts.
export default async function KybPage() {
  const me = await getCurrentUser();
  if (!me) return null;

  let details: KybDetails | null = null;
  let entityTypes: TypeDefinitionRow[] = [];
  let documentTypes: TypeDefinitionRow[] = [];
  let partyRoles: TypeDefinitionRow[] = [];
  let error: string | null = null;
  try {
    [details, entityTypes, documentTypes, partyRoles] = await Promise.all([
      api.get<KybDetails>("/platform/kyb/organisation/mine/details"),
      api.get<TypeDefinitionRow[]>("/type-definitions?domain=kyb_entity_type"),
      api.get<TypeDefinitionRow[]>("/type-definitions?domain=kyb_document_type"),
      api.get<TypeDefinitionRow[]>("/type-definitions?domain=kyb_party_role"),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load business verification status.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader title={kybCopy.title} description={kybCopy.description} />
      {error ? <DashboardErrorState message={error} /> : null}
      {!error && details ? (
        <KybWorkspace
          submission={details.submission}
          initialDocuments={details.documents}
          request={details.request}
          checklist={details.checklist}
          entityTypes={entityTypes.map((t) => ({ code: t.code, label: t.label }))}
          documentTypes={documentTypes
            .filter((t) => t.code !== "tax_good_standing")
            .map((t) => ({ code: t.code, label: t.label }))}
          partyRoles={partyRoles.map((t) => ({ code: t.code, label: t.label }))}
        />
      ) : null}
    </div>
  );
}
