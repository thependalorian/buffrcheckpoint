import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { Public } from "../../common/decorators/public.decorator";
import { CreateOrganisationAdminDto } from "./dto/create-organisation-admin.dto";
import { OnboardingService } from "./onboarding.service";

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // The only entry point for a brand-new customer (Section 17.1's
  // self-serve, payment-gated signup starts here). Supersedes the
  // previous two-call client-orchestrated flow (POST /organisations then
  // POST /auth/register) — the client calls this one endpoint and never
  // orchestrates tenant creation itself.
  //
  // Section 5: tighter throttling — this endpoint does real writes (a full
  // organisation + admin account) per call, so it's rate-limited harder
  // than login/password-reset (5 per 15 minutes per IP).
  @Public()
  @Throttle({ default: { ttl: 900_000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  @Post("organisation-admin")
  createOrganisationAdmin(@Body() dto: CreateOrganisationAdminDto) {
    return this.onboardingService.createOrganisationAdmin(dto);
  }
}
