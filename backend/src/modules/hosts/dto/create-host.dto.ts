import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateHostDto {
  @IsUUID()
  siteId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  contactReference?: string;

  @IsOptional()
  @IsUUID()
  organisationUnitId?: string;
}
