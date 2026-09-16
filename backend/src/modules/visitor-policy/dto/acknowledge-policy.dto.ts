import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class AcknowledgePolicyDto {
  @IsUUID()
  visitId!: string;

  @IsUUID()
  policyVersionId!: string;

  // type_definition domain 'legal_basis_code' — Section 11.4.5a's "notice is
  // not always consent" distinction.
  @IsIn(["mandatory_notice", "optional_consent"])
  legalBasisCode!: string;

  @IsString()
  languageShownCode!: string; // type_definition code, domain 'language_code'

  @IsString()
  acknowledgementMethodCode!: string; // type_definition code, domain 'acknowledgement_method'

  @IsString()
  displayedAt!: string; // ISO date string

  @IsOptional()
  @IsString()
  acceptedAt?: string; // ISO date string; omitted if the visitor declined/dismissed

  @IsOptional()
  @IsString()
  signatureArtifactId?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;
}
