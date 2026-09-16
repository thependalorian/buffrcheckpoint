import { Body, Controller, Get, Patch } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CapabilityStatusService } from "./capability-status.service";
import { UpdateOrganisationCapabilityEnablementDto } from "./dto/organisation-capability-enablement.dto";
import { UpdateCapabilityStatusDto } from "./dto/update-capability-status.dto";

@Controller()
export class CapabilityStatusController {
  constructor(private readonly capabilityStatusService: CapabilityStatusService) {}

  // Section 11.6.1: the website's public, read-only endpoint — no auth,
  // no organisation scoping (this status isn't per-tenant, Section 4a.7).
  @Public()
  @Get("public/capability-status")
  listPublic() {
    return this.capabilityStatusService.listPublic();
  }

  @Patch("capability-status")
  @RequirePermission(PERMISSIONS.CAPABILITY_STATUS_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "platform_capability_status.update", resourceType: "platform_capability_status" })
  update(@Body() dto: UpdateCapabilityStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.capabilityStatusService.update(dto, user);
  }

  /** Tenant-scoped effective flags — platform live AND org enabled. */
  @Get("capability-enablement/effective")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listEffective(@CurrentUser() user: AuthenticatedUser) {
    return this.capabilityStatusService.listEffectiveForOrganisation(user);
  }

  @Get("organisation/capability-enablement")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listOrganisationEnablement(@CurrentUser() user: AuthenticatedUser) {
    return this.capabilityStatusService.listOrganisationEnablement(user);
  }

  @Patch("organisation/capability-enablement")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "organisation_capability_enablement.update", resourceType: "organisation_capability_enablement" })
  upsertOrganisationEnablement(
    @Body() dto: UpdateOrganisationCapabilityEnablementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.capabilityStatusService.upsertOrganisationEnablement(dto, user);
  }
}
