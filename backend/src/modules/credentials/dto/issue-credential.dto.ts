import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class IssueCredentialDto {
  @IsIn(["visitor", "contractor", "staff"])
  holderTypeCode!: string;

  @IsUUID()
  holderId!: string;

  @IsIn(["nfc_badge", "nfc_phone", "printed_badge", "diginam_reference"])
  credentialTypeCode!: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class RevokeCredentialDto {
  @IsString()
  reason!: string;
}
