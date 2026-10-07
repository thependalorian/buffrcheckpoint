import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsUUID } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { AuthenticatedOnly } from "../../common/decorators/authenticated-only.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateOrganisationAdminDto, CreateOrganisationWithBuffrIdDto } from "./dto/create-organisation-admin.dto";
import { OnboardingService } from "./onboarding.service";
import { OnboardingTestVisitService } from "./onboarding-test-visit.service";
import { OrganisationDefaultsService } from "./organisation-defaults.service";
import { StaffTrainingService } from "./staff-training.service";

/** Client-generated id so a retried request never creates a second row. */
class ClientIdDto {
  @IsUUID()
  id!: string;
}

@Controller("onboarding")
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly testVisits: OnboardingTestVisitService,
    private readonly training: StaffTrainingService,
    private readonly defaults: OrganisationDefaultsService,
  ) {}

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

  // Create an organisation from a Buffr ID sign-in: the owner is the person who signed in, with no Checkpoint password.
  @Public()
  @Throttle({ default: { ttl: 900_000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  @Post("organisation-buffr-id")
  createOrganisationWithBuffrId(@Body() dto: CreateOrganisationWithBuffrIdDto) {
    return this.onboardingService.createOrganisationWithBuffrId(dto);
  }

  // Fills in whatever the organisation is missing (site, first host, standard form, QR, privacy notice, retention) so setup opens with
  // a working check-in. Idempotent: it never changes anything that already exists.
  @Post("defaults")
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "organisation_onboarding.defaults", resourceType: "organisation_onboarding_states" })
  ensureDefaults(@CurrentUser() user: AuthenticatedUser) {
    return this.defaults.ensure(user);
  }

  @Get("test-visit")
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  async testVisit(@CurrentUser() user: AuthenticatedUser) {
    const latest = await this.testVisits.latest(user);
    if (latest) return { visit: latest, target: null };
    // No test visit yet: say where it will land, or why it cannot be made.
    const target = await this.testVisits.preview(user).catch(() => null);
    return { visit: null, target };
  }

  @Post("test-visit")
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "organisation_onboarding.test_visit", resourceType: "visitor_visits" })
  createTestVisit(@Body() dto: ClientIdDto, @CurrentUser() user: AuthenticatedUser) {
    return this.testVisits.create(dto.id, user);
  }

  // Every staff member acknowledges their own training, so no permission:
  // the row is always written for the calling user only.
  @Get("training-acknowledgements")
  @RequireVerifiedEmail()
  trainingStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.training.latest(user);
  }

  @Post("training-acknowledgements")
  @AuthenticatedOnly()
  @RequireVerifiedEmail()
  @AuditLog({ action: "staff_training.acknowledge", resourceType: "staff_training_acknowledgements" })
  acknowledgeTraining(@Body() dto: ClientIdDto, @CurrentUser() user: AuthenticatedUser) {
    return this.training.acknowledge(dto.id, user);
  }
}
