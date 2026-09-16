import { IsInt, IsOptional, IsUUID, Min } from "class-validator";

export class CreateRetentionPolicyDto {
  @IsOptional()
  @IsUUID()
  siteId?: string; // omitted = organisation default (Addendum §7.1's "Public-Sector Tenant Policy" is this same table)

  @IsInt()
  @Min(1)
  retentionDays!: number;
}

export class UpdateRetentionPolicyDto {
  @IsInt()
  @Min(1)
  retentionDays!: number;
}
