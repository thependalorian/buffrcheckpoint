import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

const BANNED_RAW_IDENTITY_KEYS = [
  "identityPayload",
  "rawCertificate",
  "rawBiometricData",
  "eIdChipDump",
  "nationalIdNumber",
  "certificatePrivateKey",
] as const;

@ValidatorConstraint({ name: "noBannedIdentityFields", async: false })
class NoBannedIdentityFieldsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (value === null || value === undefined || typeof value !== "object") return true;
    const keys = Object.keys(value as Record<string, unknown>);
    return !keys.some((k) => (BANNED_RAW_IDENTITY_KEYS as readonly string[]).includes(k));
  }

  defaultMessage() {
    return `Request must not include raw identity fields: ${BANNED_RAW_IDENTITY_KEYS.join(", ")}`;
  }
}

export class VerifyIdentityDto {
  @IsUUID()
  visitId!: string;

  @IsString()
  requestedAssuranceLevelCode!: string;

  @IsString()
  purposeCode!: string;

  @IsString()
  relyingPartyReference!: string;

  @IsOptional()
  @IsIn(["diginam", "discovery"])
  providerCode?: "diginam" | "discovery";

  @IsOptional()
  @Validate(NoBannedIdentityFieldsConstraint)
  extra?: Record<string, unknown>;
}
