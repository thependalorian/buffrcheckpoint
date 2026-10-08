import { Equals, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

import { MeetsPasswordPolicy } from "../../../common/auth/password-policy";
import { NormaliseEmail } from "../../../common/decorators/normalise-email.decorator";

export class CreateOrganisationAdminDto {
  @IsString()
  organisationName!: string;

  @IsString()
  sectorCode!: string;

  @NormaliseEmail()
  @IsEmail()
  email!: string;

  // Same policy as backend/src/modules/auth/dto/register.dto.ts.
  @IsString()
  @MeetsPasswordPolicy()
  password!: string;

  // The owner must agree to the Terms and Conditions and the Privacy Policy to create an account. The acceptance is recorded in the
  // audit chain with the version that was current (legal/legal-documents.ts). Anything but `true` is refused.
  @Equals(true, { message: "You must accept the Terms and Conditions and the Privacy Policy to create an account" })
  acceptTerms!: boolean;

  // Honeypot: the real form never fills this in and hides it from people. Bots that complete every field do.
  @IsOptional()
  @IsString()
  website?: string;
}

export class CreateOrganisationWithBuffrIdDto {
  @IsString()
  @MinLength(20)
  idToken!: string;

  @IsString()
  organisationName!: string;

  @IsString()
  sectorCode!: string;

  @Equals(true, { message: "You must accept the Terms and Conditions and the Privacy Policy to create an account" })
  acceptTerms!: boolean;

  @IsOptional()
  @IsString()
  nonce?: string;
}
