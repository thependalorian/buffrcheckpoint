import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateKioskExperienceConfigDto {
  @IsUUID()
  siteId!: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsString()
  configName?: string;
}

export class CreateKioskExperienceVersionDto {
  @IsOptional()
  @IsInt()
  @Min(30)
  idleTimeoutSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  idleWarningSeconds?: number;

  @IsOptional()
  @IsBoolean()
  maintenanceModeEnabled?: boolean;

  @IsOptional()
  @IsString()
  maintenanceMessage?: string;

  @IsOptional()
  @IsString()
  assistedEntryDirection?: string;

  @IsOptional()
  @IsBoolean()
  accessibilityLargeTextEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  captureChannelCodes?: string[];
}
