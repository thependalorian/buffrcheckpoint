import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { RecordVerificationDto } from "./dto/record-verification.dto";
import { VerifyIdentityDto } from "./dto/verify-identity.dto";
import { IdentityVerificationService } from "./identity-verification.service";
import { IdentityVerificationOrchestratorService } from "./identity-verification-orchestrator.service";

@Controller("identity-verification")
export class IdentityVerificationController {
  constructor(
    private readonly service: IdentityVerificationService,
    private readonly orchestrator: IdentityVerificationOrchestratorService,
  ) {}

  @Post()
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  record(@Body() dto: RecordVerificationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.record(dto, user);
  }

  @Post("verify")
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  verify(@Body() dto: VerifyIdentityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.orchestrator.verify(dto, user);
  }

  @Get("visit/:visitId")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  listForVisit(@Param("visitId") visitId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listForVisit(visitId, user);
  }
}
