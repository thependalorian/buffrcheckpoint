import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateDeviceDto {
  @IsUUID()
  siteId!: string;

  @IsString()
  manufacturer!: string;

  @IsString()
  model!: string;

  @IsString()
  serialNumber!: string;

  @IsOptional()
  @IsBoolean()
  radioWifi?: boolean;

  @IsOptional()
  @IsBoolean()
  radioBluetooth?: boolean;

  @IsOptional()
  @IsBoolean()
  radioNfc?: boolean;

  @IsOptional()
  @IsBoolean()
  radioCellular?: boolean;

  @IsOptional()
  @IsString()
  supplierEvidenceReference?: string;

  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  @IsOptional()
  @IsDateString()
  warrantyExpiresAt?: string;
}
