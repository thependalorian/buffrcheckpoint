import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateKioskExperienceConfigDto, CreateKioskExperienceVersionDto } from "./dto/kiosk-experience.dto";
import { KioskExperienceService } from "./kiosk-experience.service";

@Controller("kiosk-experience")
export class KioskExperienceController {
  constructor(private readonly kioskExperienceService: KioskExperienceService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "kiosk_experience_config.create", resourceType: "kiosk_experience_configuration" })
  create(@Body() dto: CreateKioskExperienceConfigDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kioskExperienceService.createConfig(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.kioskExperienceService.listConfigs(user);
  }

  @Get("effective")
  getEffective(
    @Query("siteId") siteId: string,
    @Query("deviceId") deviceId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kioskExperienceService.getEffective(siteId, deviceId, user);
  }

  @Get(":configId")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  get(@Param("configId") configId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.kioskExperienceService.getConfig(configId, user);
  }

  @Get(":configId/versions")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listVersions(@Param("configId") configId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.kioskExperienceService.listVersions(configId, user);
  }

  @Post(":configId/versions")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "kiosk_experience_version.create", resourceType: "kiosk_experience_configuration_version" })
  createVersion(
    @Param("configId") configId: string,
    @Body() dto: CreateKioskExperienceVersionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kioskExperienceService.createVersion(configId, dto, user);
  }

  @Post(":configId/versions/:versionId/publish")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "kiosk_experience_version.publish", resourceType: "kiosk_experience_configuration_version" })
  publishVersion(
    @Param("configId") configId: string,
    @Param("versionId") versionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kioskExperienceService.publishVersion(configId, versionId, user);
  }
}
