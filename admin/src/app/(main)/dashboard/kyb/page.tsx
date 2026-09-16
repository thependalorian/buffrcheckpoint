import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/me";

import { KybSubmissionForm } from "./_components/kyb-submission-form";

interface KybSubmission {
  id: string;
  registeredBusinessName: string;
  businessRegistrationNumber: string;
  statusCode: string;
  submittedAt: string;
  verifiedAt: string | null;
}

interface TypeDefinitionRow {
  id: string;
  code: string;
  label: string;
}

// Customer-facing KYB — business-identity verification at onboarding only,
// gating organisation_subscription's 'active' transition
// (backend/src/modules/billing/billing.service.ts). Not ongoing
// sanctions/AML monitoring — see backend/src/db/schema/kyb.ts.
export default async function KybPage() {
  const me = await getCurrentUser();
  if (!me) return null;

  let submission: KybSubmission | null = null;
  let statusLabels = new Map<string, string>();
  let error: string | null = null;
  try {
    const [latest, statuses] = await Promise.all([
      api.get<KybSubmission | null>("/platform/kyb/organisation/mine"),
      api.get<TypeDefinitionRow[]>("/type-definitions?domain=kyb_status"),
    ]);
    submission = latest;
    statusLabels = new Map(statuses.map((s) => [s.id, s.label]));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load business verification status.";
  }

  const statusLabel = submission ? (statusLabels.get(submission.statusCode) ?? submission.statusCode) : null;
  const needsSubmission = !submission || statusLabel === "Rejected" || statusLabel === "Expired";

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Business Verification"
        description="Submit your business registration details once to unlock billing activation. Buffr's platform team reviews it — this is identity verification at onboarding, not ongoing monitoring."
      />
      {error ? <DashboardErrorState message={error} /> : null}
      {!error && needsSubmission ? (
        <>
          {submission ? (
            <Card>
              <CardContent className="pt-4">
                <p className="text-foreground text-sm">
                  Your previous submission was <Badge variant="destructive">{statusLabel}</Badge>. Please resubmit.
                </p>
              </CardContent>
            </Card>
          ) : null}
          <KybSubmissionForm />
        </>
      ) : null}
      {!error && !needsSubmission ? (
        <Card>
          <CardContent className="space-y-1 pt-4">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground text-sm">{submission?.registeredBusinessName}</p>
              <Badge variant={statusLabel === "Verified" ? "default" : "secondary"}>{statusLabel}</Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Reg #{submission?.businessRegistrationNumber} · submitted{" "}
              {submission ? new Date(submission.submittedAt).toLocaleDateString() : ""}
              {submission?.verifiedAt ? ` · verified ${new Date(submission.verifiedAt).toLocaleDateString()}` : ""}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
