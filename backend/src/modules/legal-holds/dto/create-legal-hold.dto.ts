import { IsObject, IsString } from "class-validator";

export class CreateLegalHoldDto {
  @IsObject()
  scope!: Record<string, unknown>;

  @IsString()
  reason!: string;
}

export class ReleaseLegalHoldDto {
  @IsString()
  reason!: string;
}
