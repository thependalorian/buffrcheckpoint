import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { AuthenticatedOnly } from "../../common/decorators/authenticated-only.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { DsarService } from "./dsar.service";
import { CreateDsarDto, ExtendDsarDto, ResolveDsarDto } from "./dto/create-dsar.dto";

@Controller("dsar")
export class DsarController {
  constructor(private readonly dsarService: DsarService) {}

  // Requires auth (not @Public()): filing a DSAR — including an
  // account-deletion request, Section 11.4.4 — needs an organisationId to
  // route it to, and the only reliable source for that today is the
  // caller's own session. A fully public, no-login DSAR intake form (e.g.
  // for a one-time visitor with no account at all) needs its own
  // org-resolution design — not specified yet in Section 11.4.4 — before it
  // can be built; noted here rather than faked with a guess.
  @Post()
  @AuthenticatedOnly()
  create(@Body() dto: CreateDsarDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dsarService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.DSAR_MANAGE)
  list(@CurrentUser() user: AuthenticatedUser, @Query("requestTypeCode") requestTypeCode?: string) {
    return this.dsarService.list(user, requestTypeCode ? { requestTypeCode } : undefined);
  }

  @Post(":id/extend")
  @RequirePermission(PERMISSIONS.DSAR_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "dsar.extend", resourceType: "data_subject_request" })
  extend(@Param("id") id: string, @Body() dto: ExtendDsarDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dsarService.extend(id, dto.reason, user);
  }

  /** Accepts an account-deletion request: needs a fresh sign-in, checks legal holds, ends the account's access and plans the tasks. */
  @Post(":id/accept")
  @RequirePermission(PERMISSIONS.DSAR_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "dsar.accept", resourceType: "data_subject_request", writeAhead: true })
  accept(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dsarService.accept(id, user);
  }

  @Post(":id/resolve")
  @RequirePermission(PERMISSIONS.DSAR_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "dsar.resolve", resourceType: "data_subject_request", writeAhead: true })
  resolve(@Param("id") id: string, @Body() dto: ResolveDsarDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dsarService.resolve(id, dto.resolution, dto.reason, user);
  }

  @Get(":id/package")
  @RequirePermission(PERMISSIONS.DSAR_MANAGE)
  getPackage(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dsarService.getPackage(id, user);
  }

  @Get(":id/download")
  @RequirePermission(PERMISSIONS.DSAR_MANAGE)
  download(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dsarService.download(id, user);
  }

  @Get(":id/files/:name")
  @RequirePermission(PERMISSIONS.DSAR_MANAGE)
  downloadFile(@Param("id") id: string, @Param("name") name: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dsarService.downloadFile(id, name, user);
  }
}
