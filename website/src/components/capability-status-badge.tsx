import { Badge } from "@/components/ui/badge";

type PublicCapabilityStatusValue = "not_available" | "targeted" | "live";

type PublicCapabilityStatusResponse = {
  diginamVerification: PublicCapabilityStatusValue;
  nationalEidNfc: PublicCapabilityStatusValue;
  nfcBadgeCheckIn: PublicCapabilityStatusValue;
  ussd: PublicCapabilityStatusValue;
  qrInvitationCheckIn: PublicCapabilityStatusValue;
  smsContactConfirmation: PublicCapabilityStatusValue;
};

type CapabilityCode =
  | "diginam_verification"
  | "national_eid_nfc"
  | "nfc_badge_checkin"
  | "ussd"
  | "qr_invitation_checkin"
  | "sms_contact_confirmation";

const RESPONSE_KEYS: Record<CapabilityCode, keyof PublicCapabilityStatusResponse> = {
  diginam_verification: "diginamVerification",
  national_eid_nfc: "nationalEidNfc",
  nfc_badge_checkin: "nfcBadgeCheckIn",
  ussd: "ussd",
  qr_invitation_checkin: "qrInvitationCheckIn",
  sms_contact_confirmation: "smsContactConfirmation",
};

const LABELS: Record<PublicCapabilityStatusValue, string> = {
  not_available: "Not available",
  targeted: "Targeted",
  live: "Live",
};

// text-ash (#9a9a94, ~2.57:1 on --color-cloud) and text-sodium-yellow
// (#e2a603, ~1.97:1) both fail WCAG AA as text — border color stays the
// brand shade (borders aren't subject to text-contrast rules), text color
// uses the darker "ink" pairing (--color-slate at 4.84:1, --color-sodium-
// yellow-ink at 4.88:1) so the status label itself stays legible.
const CLASSES: Record<PublicCapabilityStatusValue, string> = {
  not_available: "border-ash/40 text-slate",
  targeted: "border-sodium-yellow/40 text-sodium-yellow-ink",
  live: "border-status-live/40 text-status-live",
};

async function fetchCapabilityStatus(capabilityCode: CapabilityCode): Promise<PublicCapabilityStatusValue> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${apiUrl}/public/capability-status`, { next: { revalidate: 300 } });
    if (!res.ok) return "not_available";
    const body: PublicCapabilityStatusResponse = await res.json();
    return body[RESPONSE_KEYS[capabilityCode]] ?? "not_available";
  } catch {
    return "not_available";
  }
}

export async function fetchPublicCapabilityStatus(): Promise<PublicCapabilityStatusResponse | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${apiUrl}/public/capability-status`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as PublicCapabilityStatusResponse;
  } catch {
    return null;
  }
}

export async function CapabilityStatusBadge({
  capabilityCode,
  label,
}: {
  capabilityCode: CapabilityCode;
  label: string;
}) {
  const status = await fetchCapabilityStatus(capabilityCode);
  return (
    <Badge variant="outline" className={CLASSES[status]}>
      {label}: {LABELS[status]}
    </Badge>
  );
}
