import { IsDateString, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateInvitationDto {
  @IsUUID()
  siteId!: string;

  @IsUUID()
  hostId!: string;

  @IsString()
  visitorReference!: string;

  @IsOptional()
  @IsString()
  visitorCategoryCode?: string;

  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @IsDateString()
  expiresAt!: string;
}
