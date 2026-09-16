import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateOrganisationCapabilityEnablementDto {
  @IsString()
  capabilityCode!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  configurationReference?: string;
}
