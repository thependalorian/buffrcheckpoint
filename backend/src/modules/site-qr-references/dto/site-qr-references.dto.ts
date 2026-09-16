import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateSiteQrReferenceDto {
  @IsUUID()
  siteId!: string;

  @IsString()
  qrTypeCode!: string;

  @IsOptional()
  @IsString()
  label?: string;
}

export class RotateSiteQrReferenceDto {
  @IsOptional()
  activeUntil?: string;
}
