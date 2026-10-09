import { Controller, Get, Query, StreamableFile } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { EXPORT_CONTENT_TYPE, parseExportFormat, serialiseExport } from "../../common/export/tabular";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // Viewing audit logs is a privileged, sensitive read (Section 3 correction
  // #6's explicit list) — gated on verified email, same as evidence export.
  @Get("events")
  @RequirePermission(PERMISSIONS.AUDIT_READ)
  @RequireVerifiedEmail()
  @AuditLog({ action: "audit_log.read", resourceType: "audit_event" })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    return this.auditService.listForOrganisation(user, {
      from,
      to,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get("events/export")
  @RequirePermission(PERMISSIONS.AUDIT_READ)
  @RequireVerifiedEmail()
  @AuditLog({ action: "audit_log.export", resourceType: "audit_event", writeAhead: true })
  async exportEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("format") format?: string,
  ) {
    const exportFormat = parseExportFormat(format);
    const table = await this.auditService.exportForOrganisation(user, { from, to });
    return new StreamableFile(await serialiseExport(table, exportFormat, "Audit log"), {
      type: EXPORT_CONTENT_TYPE[exportFormat],
      disposition: `attachment; filename="audit-log.${exportFormat}"`,
    });
  }

  @Get("verify")
  @RequirePermission(PERMISSIONS.AUDIT_READ)
  @RequireVerifiedEmail()
  verify(@CurrentUser() user: AuthenticatedUser) {
    return this.auditService.verifyChainIntegrity(user);
  }
}
