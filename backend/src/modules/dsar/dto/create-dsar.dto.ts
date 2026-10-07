import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class CreateDsarDto {
  @IsString()
  subjectReference!: string;

  @IsIn(["data_export", "correction", "account_deletion"])
  requestTypeCode!: string;
}

export class ResolveDsarDto {
  @IsIn(["completed", "rejected"])
  resolution!: "completed" | "rejected";

  @IsString()
  reason!: string;
}

export class ExtendDsarDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
