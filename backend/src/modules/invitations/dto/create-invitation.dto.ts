import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

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

  /**
   * Where to send the invitation. Optional and never stored: it is used once, to email the check-in link, and then forgotten.
   * The host chooses to send it, so this is the host's own act, not a mailing list.
   */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  visitorEmail?: string;
}
