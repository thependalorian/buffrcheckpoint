import { CapabilityEnablementPanel } from "@/app/(main)/dashboard/site-experience/capabilities/_components/capability-enablement-panel";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

interface PublicCapabilityStatus {
  diginamVerification: string;
  nationalEidNfc: string;
  nfcBadgeCheckIn: string;
  ussd: string;
  qrInvitationCheckIn: string;
  smsContactConfirmation: string;
  cimsoInnterchange: string;
}

interface OrganisationEnablementRow {
  capabilityCode: string;
  statusCode: string;
}

const CAPABILITY_CATALOG = [
  { code: "nfc_badge_checkin", label: "NFC badge check-in", key: "nfcBadgeCheckIn" as const },
  { code: "qr_invitation_checkin", label: "QR invitation check-in", key: "qrInvitationCheckIn" as const },
  { code: "diginam_verification", label: "DigiNam verification", key: "diginamVerification" as const },
  { code: "national_eid_nfc", label: "National e-ID NFC", key: "nationalEidNfc" as const },
  { code: "ussd", label: "USSD feature-phone check-in", key: "ussd" as const },
  { code: "sms_contact_confirmation", label: "SMS contact confirmation", key: "smsContactConfirmation" as const },
  {
    code: "cimso_innterchange",
    label: "CiMSO INNterchange (PMS)",
    key: "cimsoInnterchange" as const,
    configureHref: "/dashboard/site-experience/cimso",
  },
];

export default async function CapabilitiesPage() {
  let platform: PublicCapabilityStatus | null = null;
  let orgRows: OrganisationEnablementRow[] = [];
  let error: string | null = null;

  try {
    [platform, orgRows] = await Promise.all([
      api.get<PublicCapabilityStatus>("/public/capability-status"),
      api.get<OrganisationEnablementRow[]>("/organisation/capability-enablement"),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load capability enablement.";
  }

  const orgEnabledByCode = new Map(orgRows.map((row) => [row.capabilityCode, row.statusCode === "approved"]));

  const capabilities = CAPABILITY_CATALOG.map((item) => ({
    code: item.code,
    label: item.label,
    platformStatus: platform?.[item.key] ?? "not_available",
    orgEnabled: orgEnabledByCode.get(item.code) ?? false,
    configureHref: "configureHref" in item ? item.configureHref : undefined,
  }));

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Capability enablement"
        description="Turn platform-available integrations on for your organisation. Platform status is managed by Buffr Checkpoint support. CiMSO can be enabled while platform status is targeted or live."
      />
      {error ? <DashboardErrorState message={error} /> : <CapabilityEnablementPanel capabilities={capabilities} />}
    </div>
  );
}
