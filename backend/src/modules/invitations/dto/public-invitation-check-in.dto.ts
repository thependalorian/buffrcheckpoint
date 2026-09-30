import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class PublicInvitationCheckInDto {
  @IsUUID()
  id!: string;

  @IsString()
  @MinLength(16)
  @MaxLength(512)
  token!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  visitorName!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(40)
  visitorPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  purposeCategoryCode?: string;
}
