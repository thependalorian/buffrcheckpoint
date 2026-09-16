import { IsOptional, IsUUID } from "class-validator";

export class CreateCredentialEntitlementDto {
  @IsUUID()
  siteId!: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;
}
