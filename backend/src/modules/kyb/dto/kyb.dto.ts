import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import { ENTITY_TYPES } from "../kyb-validation";

export class KybMemberDto {
  @IsString()
  @MaxLength(200)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  identityNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;
}

/** The organisation is always the caller's own, never taken from the body. */
export class SubmitKybDto {
  @IsIn([...ENTITY_TYPES])
  entityType!: string;

  @IsString()
  @MaxLength(40)
  businessRegistrationNumber!: string;

  @IsString()
  @MaxLength(200)
  registeredBusinessName!: string;

  @IsString()
  @MaxLength(400)
  registeredAddress!: string;

  @IsString()
  @MaxLength(200)
  authorizedSignatoryName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  principalBusiness?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  financialYearEnd?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => KybMemberDto)
  members?: KybMemberDto[];

  /** For each field, where its value came from: "document" (read from a file and left as is), "edited" (read, then changed) or "typed". */
  @IsOptional()
  @IsObject()
  fieldSources?: Record<string, string>;
}

export class ValidateKybDto extends SubmitKybDto {}

export class UploadKybDocumentDto {
  @IsString()
  @MaxLength(60)
  documentType!: string;
}

export class DecideKybDto {
  @IsIn(["verified", "rejected", "needs_info"])
  decision!: "verified" | "rejected" | "needs_info";

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  flaggedFields?: string[];
}

export class DecideKybDocumentDto {
  @IsIn(["accepted", "rejected"])
  decision!: "accepted" | "rejected";

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note?: string;
}

export class DecideKybBulkDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  kybVerificationIds!: string[];

  @IsIn(["verified", "rejected"])
  decision!: "verified" | "rejected";

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
