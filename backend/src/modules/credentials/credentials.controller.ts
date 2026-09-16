import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CredentialsService } from "./credentials.service";
import { CreateCredentialEntitlementDto } from "./dto/credential-entitlement.dto";
import { IssueCredentialDto, RevokeCredentialDto } from "./dto/issue-credential.dto";
import { OpenReaderSessionDto, ValidateCredentialDto } from "./dto/validate-credential.dto";

// Section 3 correction #6's "add devices" — the closest existing analog is
// issuing/revoking a physical credential (NFC badge/token); gated the same way.
@Controller("credentials")
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "credential.issue", resourceType: "credential" })
  issue(@Body() dto: IssueCredentialDto, @CurrentUser() user: AuthenticatedUser) {
    return this.credentialsService.issue(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.credentialsService.list(user);
  }

  @Post(":id/revoke")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "credential.revoke", resourceType: "credential" })
  revoke(@Param("id") id: string, @Body() dto: RevokeCredentialDto, @CurrentUser() user: AuthenticatedUser) {
    return this.credentialsService.revoke(id, dto.reason, user);
  }

  // Kiosk NFC fast lane read: deliberately gated by credential.validate, not
  // site.configure — a kiosk should be able to check a badge without being
  // able to issue or revoke one. No @RequireVerifiedEmail(): this is a
  // routine operational check, same tier as check-in itself.
  @Post("reader-sessions")
  @RequirePermission(PERMISSIONS.CREDENTIAL_VALIDATE)
  openReaderSession(@Body() dto: OpenReaderSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.credentialsService.openReaderSession(dto.deviceId, user);
  }

  @Post("validate")
  @RequirePermission(PERMISSIONS.CREDENTIAL_VALIDATE)
  validate(@Body() dto: ValidateCredentialDto, @CurrentUser() user: AuthenticatedUser) {
    return this.credentialsService.validate(dto, user);
  }

  @Get(":id/entitlements")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listEntitlements(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.credentialsService.listEntitlements(id, user);
  }

  @Post(":id/entitlements")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "credential.entitlement.add", resourceType: "credential_site_entitlement" })
  addEntitlement(
    @Param("id") id: string,
    @Body() dto: CreateCredentialEntitlementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.credentialsService.addEntitlement(id, dto, user);
  }

  @Post(":id/entitlements/:entitlementId/remove")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "credential.entitlement.remove", resourceType: "credential_site_entitlement" })
  removeEntitlement(
    @Param("id") id: string,
    @Param("entitlementId") entitlementId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.credentialsService.removeEntitlement(id, entitlementId, user);
  }
}
