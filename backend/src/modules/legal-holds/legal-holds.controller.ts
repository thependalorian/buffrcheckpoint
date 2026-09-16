import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateLegalHoldDto, ReleaseLegalHoldDto } from "./dto/create-legal-hold.dto";
import { LegalHoldsService } from "./legal-holds.service";

// Section 3 correction #6's explicit list — legal holds are a privileged
// compliance action, gated on verified email throughout.
@Controller("legal-holds")
export class LegalHoldsController {
  constructor(private readonly legalHoldsService: LegalHoldsService) {}

  @Post()
  @RequirePermission(PERMISSIONS.LEGAL_HOLD_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "legal_hold.create", resourceType: "legal_hold" })
  create(@Body() dto: CreateLegalHoldDto, @CurrentUser() user: AuthenticatedUser) {
    return this.legalHoldsService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.LEGAL_HOLD_MANAGE)
  @RequireVerifiedEmail()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.legalHoldsService.list(user);
  }

  @Post(":id/release")
  @RequirePermission(PERMISSIONS.LEGAL_HOLD_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "legal_hold.release", resourceType: "legal_hold" })
  release(@Param("id") id: string, @Body() dto: ReleaseLegalHoldDto, @CurrentUser() user: AuthenticatedUser) {
    return this.legalHoldsService.release(id, dto.reason, user);
  }
}
