import { Controller, Get } from "@nestjs/common";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { RequireMfa } from "../../common/decorators/require-mfa.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { ComplianceService } from "./compliance.service";

@Controller("compliance")
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get("dashboard")
  @RequirePermission(PERMISSIONS.AUDIT_READ)
  @RequireVerifiedEmail()
  @RequireMfa()
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.complianceService.dashboard(user);
  }
}
