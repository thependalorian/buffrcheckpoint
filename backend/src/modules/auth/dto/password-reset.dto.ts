import { IsEmail, IsString } from "class-validator";

import { MeetsPasswordPolicy } from "../../../common/auth/password-policy";
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
  @MeetsPasswordPolicy()
  newPassword!: string;
}
