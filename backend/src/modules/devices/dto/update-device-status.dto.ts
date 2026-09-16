import { IsIn, IsString } from "class-validator";

// Section 14.3a's 7-value cran_compliance_status sequence — seeded in
// backend/db/seed/0001_type_definitions.sql, not a hardcoded application
// enum, but validated here against the same fixed vocabulary so a caller
// gets a 400 rather than a type_definition lookup failure on a typo.
const CRAN_STATUS_CODES = [
  "unassessed",
  "supplier_evidence_received",
  "exemption_assessed",
  "cran_certificate_confirmed",
  "mdm_enrolled",
  "approved_for_deployment",
  "retired",
] as const;

export class UpdateDeviceStatusDto {
  @IsString()
  @IsIn(CRAN_STATUS_CODES)
  statusCode!: (typeof CRAN_STATUS_CODES)[number];

  @IsString()
  reason!: string;
}
