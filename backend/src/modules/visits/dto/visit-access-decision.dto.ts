import { IsOptional, IsString } from "class-validator";

export class VisitAccessDecisionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
