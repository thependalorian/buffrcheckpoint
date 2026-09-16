import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateSiteDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;
}
