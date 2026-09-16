import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateOrganisationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  tradingName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  defaultTimezone?: string;

  /** type_definition code in domain organisation_sector */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  sectorCode?: string;
}
