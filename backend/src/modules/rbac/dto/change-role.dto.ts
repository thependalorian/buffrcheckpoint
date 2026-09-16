import { IsOptional, IsString, IsUUID } from "class-validator";

export class ChangeRoleDto {
  @IsUUID()
  userId!: string;

  @IsString()
  newRoleCode!: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsString()
  reason!: string;
}
