import { IsOptional, IsPhoneNumber, IsString } from "class-validator";

export class CreateVisitorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}
