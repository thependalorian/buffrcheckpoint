import { IsObject, IsOptional, IsUUID } from "class-validator";

export class CreateAccessPolicyDto {
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsObject()
  config!: Record<string, unknown>;
}
