import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequireMfa } from "../../common/decorators/require-mfa.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import {
  CreateSiteBrandingProfileDto,
  CreateSiteBrandingVersionDto,
  SetupSiteBrandingDto,
} from "./dto/site-branding.dto";
import { SiteBrandingService, type UploadedLogo } from "./site-branding.service";

// Memory cap for the multipart parser; the 400 KB product limit is enforced
// in the service so callers get LOGO_TOO_LARGE rather than a generic 413.
const UPLOAD_MEMORY_CAP_BYTES = 2_000_000;

@Controller("site-branding")
export class SiteBrandingController {
  constructor(private readonly siteBrandingService: SiteBrandingService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "site_branding_profile.create", resourceType: "site_branding_profile" })
  create(@Body() dto: CreateSiteBrandingProfileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.siteBrandingService.createProfile(dto, user);
  }

  @Post("assets")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: UPLOAD_MEMORY_CAP_BYTES, files: 1 } }))
  @AuditLog({ action: "site_branding_asset.upload", resourceType: "site_branding_asset" })
  uploadLogo(@UploadedFile() file: UploadedLogo | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.siteBrandingService.uploadLogo(file, user);
  }

  @Public()
  @Get("assets/:organisationId/:packageId/logo.webp")
  @Header("Content-Type", "image/webp")
  @Header("Cache-Control", "public, max-age=31536000, immutable")
  async readLogo(
    @Param("organisationId", ParseUUIDPipe) organisationId: string,
    @Param("packageId", ParseUUIDPipe) packageId: string,
  ) {
    return new StreamableFile(await this.siteBrandingService.readLogo(organisationId, packageId));
  }

  @Post("setup")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @RequireMfa()
  @AuditLog({ action: "site_branding.setup_and_publish", resourceType: "site_branding_profile_version" })
  setup(@Body() dto: SetupSiteBrandingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.siteBrandingService.setupAndPublish(dto, user);
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
