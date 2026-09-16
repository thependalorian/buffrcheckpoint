import { Controller, Get, Param, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { EvidenceService } from "./evidence.service";

@Controller("evidence")
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post("generate")
  @RequirePermission(PERMISSIONS.EVIDENCE_EXPORT)
  @RequireVerifiedEmail()
  @AuditLog({ action: "evidence_pack.generate", resourceType: "evidence_pack" })
  generate(@CurrentUser() user: AuthenticatedUser) {
    return this.evidenceService.generate(user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.EVIDENCE_EXPORT)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.evidenceService.list(user);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.EVIDENCE_EXPORT)
  @AuditLog({ action: "evidence_pack.read", resourceType: "evidence_pack" })
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.evidenceService.getById(id, user);
  }
}
