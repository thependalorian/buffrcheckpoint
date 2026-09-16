import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

export class VisitFormAnswerDto {
  @IsUUID()
  formVersionId!: string;

  @IsString()
  fieldCode!: string;

  @IsOptional()
  answerValue?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  fieldLabelSnapshot?: string;
}

// id is client-generated (kiosk or admin app) and is the idempotency key for
// offline sync retries — Section 8.5: "sync queue transmits idempotently."
export class CheckInDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  siteId!: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  visitorId?: string;

  // Used only when visitorId is omitted — a returning visitor should be
  // looked up (VisitorsService.findByPhone) and passed as visitorId
  // instead. Creates a new visitor_subjects/visitor_personal_data pair for
  // a first-time visitor so the front-desk roster has a real display name.
  @IsOptional()
  @IsString()
  visitorName?: string;

  @IsOptional()
  @IsString()
  visitorPhone?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  visitorEmail?: string;

  @IsOptional()
  @IsString()
  vehicleRegistration?: string;

  @IsOptional()
  @IsString()
  idDocumentNumber?: string;

  @IsUUID()
  hostId!: string;

  @IsString()
  visitorTypeCode!: string; // type_definition code, e.g. 'general'

  @IsOptional()
  @IsUUID()
  invitationId?: string;

  @IsOptional()
  @IsString()
  purposeCategoryCode?: string;

  @IsString()
  captureChannelCode!: string; // e.g. 'kiosk', 'assisted'

  @IsDateString()
  checkedInAt!: string;

  @IsOptional()
  @IsBoolean()
  offlineCaptured?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisitFormAnswerDto)
  formAnswers?: VisitFormAnswerDto[];
}
