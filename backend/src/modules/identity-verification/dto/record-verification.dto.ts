import { IsArray, IsDateString, IsOptional, IsString, IsUUID } from "class-validator";

export class RecordVerificationDto {
  @IsUUID()
  visitId!: string;

  @IsString()
  providerCode!: string;

  @IsString()
  assuranceLevelCode!: string;

  @IsOptional()
  @IsString()
  outcomeReference?: string;

  @IsOptional()
  @IsString()
  outcomeCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  releasedAttributeCodes?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
