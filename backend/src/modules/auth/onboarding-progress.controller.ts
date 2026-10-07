import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { IsIn, IsString } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { LAUNCH_ROUTES } from "../onboarding/onboarding-steps";
import { AuthService } from "./auth.service";
import { OnboardingProgressService } from "./onboarding-progress.service";

class OnboardingStepDto {
  @IsString()
  stepCode!: string;
}

class LaunchRouteDto {
  @IsIn(LAUNCH_ROUTES)
  route!: string;
}

/** Launch-readiness checklist (buffrcheckpoint.md v0.33). */
@Controller("auth/onboarding")
export class OnboardingProgressController {
  constructor(
    private readonly authService: AuthService,
    private readonly progress: OnboardingProgressService,
  ) {}

  @Get()
  @RequireVerifiedEmail()
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getOnboardingStatus(user);
  }

  @Get("readiness")
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  readiness(@CurrentUser() user: AuthenticatedUser) {
    return this.progress.readiness(user);
  }

  // The visitor privacy notice, retention period and check-in form as they stand, and whether the owner has accepted them.
  @Get("standards")
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  standards(@CurrentUser() user: AuthenticatedUser) {
    return this.progress.standardsSummary(user);
  }

  // The owner accepts the standards as they stand (Checkpoint's wording, or their own edits). Now or just before go-live.
  @Post("standards/accept")
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "organisation_onboarding.accept_standards", resourceType: "organisation_onboarding_states" })
  acceptStandards(@CurrentUser() user: AuthenticatedUser) {
    return this.progress.acceptStandards(user);
  }

  @Post("launch-route")
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "organisation_onboarding.launch_route", resourceType: "organisation_onboarding_states" })
  launchRoute(@Body() dto: LaunchRouteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.progress.setLaunchRoute(user, dto.route);
  }

  @Post("complete-step")
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "organisation_onboarding.complete_step", resourceType: "organisation_onboarding_states" })
  completeStep(@Body() dto: OnboardingStepDto, @CurrentUser() user: AuthenticatedUser) {
    return this.progress.completeStep(user, dto.stepCode);
  }

  // Advisory editing presence (§11.9.15.9). No audit: it is a heartbeat, not a change.
  @Post("presence")
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  presence(@Body() dto: OnboardingStepDto, @CurrentUser() user: AuthenticatedUser) {
    return this.progress.heartbeat(user, dto.stepCode);
  }

  @Post("skip-step")
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "organisation_onboarding.skip_step", resourceType: "organisation_onboarding_states" })
  skipStep(@Body() dto: OnboardingStepDto, @CurrentUser() user: AuthenticatedUser) {
    return this.progress.skipStep(user, dto.stepCode);
  }
}
