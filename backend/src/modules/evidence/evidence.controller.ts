import { Controller, Get, Header, Param, Post, Query, StreamableFile } from "@nestjs/common";

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
  generate(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.evidenceService.generate(user, { from, to });
  }

  @Get()
  @RequirePermission(PERMISSIONS.EVIDENCE_EXPORT)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.evidenceService.list(user);
  }

  // Declared before ":id" so the literal path wins.
  @Get(":id/download")
  @RequirePermission(PERMISSIONS.EVIDENCE_EXPORT)
  @RequireVerifiedEmail()
  @AuditLog({ action: "evidence_pack.download", resourceType: "evidence_pack" })
  async download(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const content = await this.evidenceService.getContent(id, user);
    return new StreamableFile(content, {
      type: "application/json",
      disposition: `attachment; filename="evidence-pack-${id}.json"`,
    });
  }

  @Get(":id/report")
  @RequirePermission(PERMISSIONS.EVIDENCE_EXPORT)
  @RequireVerifiedEmail()
  @AuditLog({ action: "evidence_pack.report", resourceType: "evidence_pack" })
  @Header("Content-Type", "text/html; charset=utf-8")
  report(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.evidenceService.renderReport(id, user);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.EVIDENCE_EXPORT)
  @AuditLog({ action: "evidence_pack.read", resourceType: "evidence_pack" })
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.evidenceService.getById(id, user);
  }
}
