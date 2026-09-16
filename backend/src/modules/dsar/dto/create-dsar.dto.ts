import { IsIn, IsString } from "class-validator";

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
