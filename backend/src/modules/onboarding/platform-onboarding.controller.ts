import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { RequireMfa } from "../../common/decorators/require-mfa.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { OnboardingStateService } from "../onboarding-state/onboarding-state.service";
import { ReopenOnboardingDto, SetOnboardingStatusDto } from "./dto/onboarding-override.dto";

// Ops Console overrides for a customer's onboarding status. The only way to
// move an organisation backward; each call writes a reasoned status-log row
// and an audit event (replaces direct-SQL status edits).
@Controller("platform/organisations/:organisationId/onboarding")
export class PlatformOnboardingController {
  constructor(private readonly onboardingState: OnboardingStateService) {}

  @Post("reopen")
  @HttpCode(HttpStatus.OK)
  @PlatformScoped()
  @RequirePermission(PERMISSIONS.PLATFORM_ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  @RequireMfa()
  @AuditLog({ action: "organisation_onboarding.reopen", resourceType: "organisation_onboarding_states" })
  reopen(
    @Param("organisationId", ParseUUIDPipe) organisationId: string,
    @Body() dto: ReopenOnboardingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.onboardingState.reopenSetup(organisationId, user.userId, dto.reason);
  }

  @Post("set-status")
  @HttpCode(HttpStatus.OK)
  @PlatformScoped()
  @RequirePermission(PERMISSIONS.PLATFORM_ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  @RequireMfa()
  @AuditLog({ action: "organisation_onboarding.set_status", resourceType: "organisation_onboarding_states" })
  setStatus(
    @Param("organisationId", ParseUUIDPipe) organisationId: string,
    @Body() dto: SetOnboardingStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.onboardingState.setStatus(organisationId, dto.status, user.userId, dto.reason);
  }
}
