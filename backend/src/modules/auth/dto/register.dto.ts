import { IsEmail, IsOptional, IsString, IsUUID } from "class-validator";

import { MeetsPasswordPolicy } from "../../../common/auth/password-policy";
import { NormaliseEmail } from "../../../common/decorators/normalise-email.decorator";

// No organisationId here — the controller always uses the authenticated
// caller's own organisationId (auth.controller.ts), never a client-supplied
// one. This DTO is for "an admin adds a teammate to their own org," not
// tenant creation (that's OnboardingService.createOrganisationAdmin).
export class RegisterDto {
  @NormaliseEmail()
  @IsEmail()
  email!: string;

  // 12 characters minimum, no composition rules (common/auth/password-policy.ts).
  @IsString()
  @MeetsPasswordPolicy()
  password!: string;

  /** Customer-assignable role_code (defaults to owner_operator if omitted). */
  @IsOptional()
  @IsString()
  roleCode?: string;

  /** Optional site scope for site-bound roles (front desk, host, site manager). */
  @IsOptional()
  @IsUUID()
  siteId?: string;
}
