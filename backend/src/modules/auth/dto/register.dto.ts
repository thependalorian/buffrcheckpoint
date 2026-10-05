import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

import { NormaliseEmail } from "../../../common/decorators/normalise-email.decorator";

// No organisationId here — the controller always uses the authenticated
// caller's own organisationId (auth.controller.ts), never a client-supplied
// one. This DTO is for "an admin adds a teammate to their own org," not
// tenant creation (that's OnboardingService.createOrganisationAdmin).
export class RegisterDto {
  @NormaliseEmail()
  @IsEmail()
  email!: string;

  // Section 13.1's minimum control baseline doesn't set a specific password
  // policy; 8 chars is a floor, not a recommendation — tighten with a real
  // policy (entropy check, breached-password list) before production launch.
  @IsString()
  @MinLength(8)
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
