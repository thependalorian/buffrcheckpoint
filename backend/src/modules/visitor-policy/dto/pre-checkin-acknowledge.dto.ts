import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class PreCheckinAcknowledgePolicyDto {
  @IsUUID()
  siteId!: string;

  @IsUUID()
  kioskSessionId!: string;

  @IsUUID()
  policyVersionId!: string;

  @IsIn(["mandatory_notice", "optional_consent"])
  legalBasisCode!: string;

  @IsString()
  languageShownCode!: string;

  @IsString()
  acknowledgementMethodCode!: string;

  @IsString()
  displayedAt!: string;

  @IsOptional()
  @IsString()
  acceptedAt?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsString()
  captureChannelCode?: string;
}
