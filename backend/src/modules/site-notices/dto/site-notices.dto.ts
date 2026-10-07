import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

import { MAX_NOTICE_LENGTH } from "../site-notices";

export class PublishNoticeDto {
  /** Leave empty to publish the organisation-wide text. */
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsString()
  @MaxLength(MAX_NOTICE_LENGTH + 2000)
  contentText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  languageCode?: string;
}

export class AcknowledgeInductionDto {
  @IsUUID()
  siteId!: string;

  @IsUUID()
  referenceId!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(40)
  visitorPhone!: string;

  /** The version the contractor read. It must still be the published one. */
  @IsUUID()
  policyVersionId!: string;
}
