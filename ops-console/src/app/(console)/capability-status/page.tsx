import { DashboardErrorState } from "@/components/dashboard-state";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, loadOrError } from "@/lib/api";

import { UpdateForm } from "./_components/update-form";

type PublicStatus = "not_available" | "targeted" | "live";

interface PublicCapabilityStatusResponse {
  diginamVerification: PublicStatus;
  nationalEidNfc: PublicStatus;
  nfcBadgeCheckIn: PublicStatus;
  ussd: PublicStatus;
  qrInvitationCheckIn: PublicStatus;
  smsContactConfirmation: PublicStatus;
  cimsoInnterchange: PublicStatus;
}

const LABELS: Record<keyof PublicCapabilityStatusResponse, string> = {
  diginamVerification: "DigiNam verification",
  nationalEidNfc: "National e-ID NFC",
  nfcBadgeCheckIn: "NFC badge check-in",
  ussd: "USSD",
  qrInvitationCheckIn: "QR invitation check-in",
  smsContactConfirmation: "SMS contact confirmation",
  cimsoInnterchange: "CiMSO INNterchange (PMS)",
};

export default async function CapabilityStatusPage() {
  const result = await loadOrError(() => apiFetch<PublicCapabilityStatusResponse>("/public/capability-status"));

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Capability Status</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const status = result.data;

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">Capability Status</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Platform-wide public display status — one row per capability, never per-org (Wiebe tenancy exception). Kiosks
        only surface a tile when effective status is <span className="font-medium">live</span>.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(LABELS) as (keyof PublicCapabilityStatusResponse)[]).map((key) => (
          <Card key={key}>
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">{LABELS[key]}</p>
              <p className="mt-1 font-medium text-foreground text-sm">{status[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-2 font-medium text-sm">Update platform status</h2>
        <p className="mb-3 text-muted-foreground text-xs">
          Dual-approval evidence required. Changing public status does not by itself enable a customer org — they still
          need organisation capability enablement where applicable.
        </p>
        <UpdateForm />
      </div>
    </div>
  );
}
