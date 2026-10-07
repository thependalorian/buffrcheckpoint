import { IsIn, IsString } from "class-validator";

// Internal status_code vocabulary is capability-specific (Section 4a.7,
// v0.4 correction) — union of every capability's allowed values. The
// service does not cross-validate that a given status belongs to the given
// capability; that check belongs in the controlling application/ops
// console, not this transport-layer DTO.
const CAPABILITY_STATUS_VALUES = [
  "discovery",
  "approved",
  "pilot",
  "live",
  "suspended",
  "targeted",
  "not_started",
  "partner_testing",
  "provider_testing",
] as const;

export class UpdateCapabilityStatusDto {
  @IsIn([
    "diginam_verification",
    "national_eid_nfc",
    "nfc_badge_checkin",
    "qr_invitation_checkin",
    "sms_contact_confirmation",
    "cimso_innterchange",
  ])
  capabilityCode!: string;

  @IsIn(CAPABILITY_STATUS_VALUES)
  status!: (typeof CAPABILITY_STATUS_VALUES)[number];

  @IsIn(["not_available", "targeted", "live"])
  publicStatus!: "not_available" | "targeted" | "live";

  @IsString()
  evidenceReference!: string;
}
