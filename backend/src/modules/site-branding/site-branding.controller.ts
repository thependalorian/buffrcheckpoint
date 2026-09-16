import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireMfa } from "../../common/decorators/require-mfa.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateSiteBrandingProfileDto, CreateSiteBrandingVersionDto } from "./dto/site-branding.dto";
import { SiteBrandingService } from "./site-branding.service";

@Controller("site-branding")
export class SiteBrandingController {
  constructor(private readonly siteBrandingService: SiteBrandingService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "site_branding_profile.create", resourceType: "site_branding_profile" })
  create(@Body() dto: CreateSiteBrandingProfileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.siteBrandingService.createProfile(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.siteBrandingService.listProfiles(user);
  }

  @Get("site/:siteId/published")
  listPublishedForSite(@Param("siteId") siteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.siteBrandingService.getPublishedForSite(siteId, user);
  }

  @Get(":profileId")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  get(@Param("profileId") profileId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.siteBrandingService.getProfile(profileId, user);
  }

  @Delete(":profileId")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "site_branding_profile.delete", resourceType: "site_branding_profile" })
  softDelete(@Param("profileId") profileId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.siteBrandingService.softDeleteProfile(profileId, user);
  }

  @Get(":profileId/versions")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listVersions(@Param("profileId") profileId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.siteBrandingService.listVersions(profileId, user);
  }

  @Post(":profileId/versions")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "site_branding_version.create", resourceType: "site_branding_profile_version" })
  createVersion(
    @Param("profileId") profileId: string,
    @Body() dto: CreateSiteBrandingVersionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.siteBrandingService.createVersion(profileId, dto, user);
  }

  @Post(":profileId/versions/:versionId/publish")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @RequireMfa()
  @AuditLog({ action: "site_branding_version.publish", resourceType: "site_branding_profile_version" })
  publishVersion(
    @Param("profileId") profileId: string,
    @Param("versionId") versionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.siteBrandingService.publishVersion(profileId, versionId, user);
  }
}
