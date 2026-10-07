import { cache } from "react";

type PublicCapabilityStatusValue = "not_available" | "targeted" | "live";

export type PublicCapabilityStatusResponse = {
  diginamVerification: PublicCapabilityStatusValue;
  nationalEidNfc: PublicCapabilityStatusValue;
  nfcBadgeCheckIn: PublicCapabilityStatusValue;
  qrInvitationCheckIn: PublicCapabilityStatusValue;
  smsContactConfirmation: PublicCapabilityStatusValue;
  cimsoInnterchange: PublicCapabilityStatusValue;
};

export type CapabilityCode =
  | "diginam_verification"
  | "national_eid_nfc"
  | "nfc_badge_checkin"
  | "qr_invitation_checkin"
  | "sms_contact_confirmation"
  | "cimso_innterchange";

const FALLBACK: PublicCapabilityStatusResponse = {
  diginamVerification: "not_available",
  nationalEidNfc: "not_available",
  nfcBadgeCheckIn: "not_available",
  qrInvitationCheckIn: "not_available",
  smsContactConfirmation: "not_available",
  cimsoInnterchange: "not_available",
};

const RESPONSE_KEYS: Record<CapabilityCode, keyof PublicCapabilityStatusResponse> = {
  diginam_verification: "diginamVerification",
  national_eid_nfc: "nationalEidNfc",
  nfc_badge_checkin: "nfcBadgeCheckIn",
  qr_invitation_checkin: "qrInvitationCheckIn",
  sms_contact_confirmation: "smsContactConfirmation",
  cimso_innterchange: "cimsoInnterchange",
};

const LABELS: Record<PublicCapabilityStatusValue, string> = {
  not_available: "Not available",
  targeted: "Targeted",
  live: "Live",
};

const STYLES: Record<PublicCapabilityStatusValue, string> = {
  not_available: "border-border bg-muted text-muted-foreground",
  targeted:
    "border-[var(--color-sodium-yellow)] bg-[color-mix(in_srgb,var(--color-sodium-yellow)_12%,transparent)] text-[var(--color-sodium-yellow-ink)]",
  live: "border-[color-mix(in_srgb,var(--color-status-live)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-status-live)_10%,transparent)] text-[var(--color-status-live)]",
};

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "https://api.buffrcheckpoint.com").replace(/\/$/, "");
}

export const fetchPublicCapabilityStatus = cache(async (): Promise<PublicCapabilityStatusResponse> => {
  try {
    const res = await fetch(`${apiBase()}/public/capability-status`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return FALLBACK;
    const json = (await res.json()) as Partial<PublicCapabilityStatusResponse>;
    return { ...FALLBACK, ...json };
  } catch {
    return FALLBACK;
  }
});

export async function CapabilityStatusBadge({
  capabilityCode,
  label,
}: {
  capabilityCode: CapabilityCode;
  label?: string;
}) {
  const caps = await fetchPublicCapabilityStatus();
  const status = caps[RESPONSE_KEYS[capabilityCode]];

  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${STYLES[status]}`}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>
        {label ? `${label}: ` : ""}
        {LABELS[status]}
      </span>
    </span>
  );
}

export function capabilityStatusLabel(status: PublicCapabilityStatusValue): string {
  return LABELS[status];
}
