import { IsOptional, IsString, IsUUID } from "class-validator";

export class UssdSessionDto {
  @IsString()
  carrierSessionReference!: string;

  @IsOptional()
  @IsString()
  providerRequestId?: string;

  @IsUUID()
  organisationId!: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsString()
  menuSelection?: string;
}
