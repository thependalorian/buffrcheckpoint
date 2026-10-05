import { IsEmail, IsString, MinLength } from "class-validator";

import { NormaliseEmail } from "../../../common/decorators/normalise-email.decorator";

export class CreateOrganisationAdminDto {
  @IsString()
  organisationName!: string;

  @IsString()
  sectorCode!: string;

  @NormaliseEmail()
  @IsEmail()
  email!: string;

  // Same floor as backend/src/modules/auth/dto/register.dto.ts — not a
  // real password policy yet, flagged there already.
  @IsString()
  @MinLength(8)
  password!: string;
}
