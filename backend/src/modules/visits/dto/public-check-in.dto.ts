import { Type } from "class-transformer";
import {
  Equals,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

import { VisitFormAnswerDto } from "./check-in.dto";

export class PublicCheckInDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  siteId!: string;

  @IsUUID()
  referenceId!: string;

  @IsUUID()
  hostId!: string;

  /** Optional security zone — when the zone has host_approval_required, visit starts pending_approval. */
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  visitorName!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(40)
  visitorPhone!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  companyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  visitorEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  vehicleRegistration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  idDocumentNumber?: string;

  @IsString()
  @MaxLength(64)
  visitorTypeCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  purposeCategoryCode?: string;

  /** Visitor must accept the site privacy notice before submit. */
  @IsBoolean()
  @Equals(true)
  privacyAcknowledged!: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisitFormAnswerDto)
  formAnswers?: VisitFormAnswerDto[];

  /** Preferred UI language for dynamic form validation (en/af/pt). */
  @IsOptional()
  @IsString()
  @MaxLength(8)
  languageCode?: string;
}

export class PublicCheckOutDto {
  @IsUUID()
  siteId!: string;

  @IsUUID()
  referenceId!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(40)
  visitorPhone!: string;

  /** Optional confirmation from check-in success screen. */
  @IsOptional()
  @IsUUID()
  visitId?: string;
}

export class SignOutByPhoneDto {
  @IsUUID()
  siteId!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(40)
  visitorPhone!: string;
}

export class PublicCheckOutTokenDto {
  @IsString()
  @MinLength(16)
  @MaxLength(512)
  token!: string;
}
