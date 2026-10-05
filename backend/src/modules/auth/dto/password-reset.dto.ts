import { IsEmail, IsString, MinLength } from "class-validator";

import { NormaliseEmail } from "../../../common/decorators/normalise-email.decorator";

export class RequestPasswordResetDto {
  @NormaliseEmail()
  @IsEmail()
  email!: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
