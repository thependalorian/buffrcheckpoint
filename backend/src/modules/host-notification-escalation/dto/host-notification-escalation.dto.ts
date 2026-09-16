import { IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateEscalationPolicyDto {
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsString()
  visitorCategoryCode?: string;

  @IsOptional()
  @IsString()
  policyName?: string;
}

export class CreateEscalationPolicyVersionDto {
  @IsOptional()
  @IsInt()
  @Min(30)
  waitSeconds?: number;

  @IsString()
  escalationActionCode!: string;

  @IsOptional()
  @IsString()
  alternateRecipientReference?: string;
}
