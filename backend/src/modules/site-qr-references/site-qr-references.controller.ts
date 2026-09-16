import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateSiteQrReferenceDto, RotateSiteQrReferenceDto } from "./dto/site-qr-references.dto";
import { SiteQrReferencesService } from "./site-qr-references.service";

@Controller("site-qr-references")
export class SiteQrReferencesController {
  constructor(private readonly siteQrReferencesService: SiteQrReferencesService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "site_qr_reference.create", resourceType: "site_qr_reference" })
  create(@Body() dto: CreateSiteQrReferenceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.siteQrReferencesService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.siteQrReferencesService.list(user);
  }

  @Get(":referenceId")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  get(@Param("referenceId") referenceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.siteQrReferencesService.getById(referenceId, user);
  }

  @Get(":referenceId/rotations")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listRotations(@Param("referenceId") referenceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.siteQrReferencesService.listRotations(referenceId, user);
  }

  @Post(":referenceId/rotate")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "site_qr_reference.rotate", resourceType: "site_qr_reference_rotation" })
  rotate(
    @Param("referenceId") referenceId: string,
    @Body() dto: RotateSiteQrReferenceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.siteQrReferencesService.rotate(referenceId, dto, user);
  }
}
