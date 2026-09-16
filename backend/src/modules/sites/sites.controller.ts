import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireMfa } from "../../common/decorators/require-mfa.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateSiteDto } from "./dto/create-site.dto";
import { SitesService } from "./sites.service";

class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsUUID()
  regionId?: string | null;

  @IsOptional()
  @IsString()
  physicalAddress?: string;

  @IsOptional()
  @IsString()
  siteCode?: string;
}

@Controller("sites")
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @RequireMfa()
  create(@Body() dto: CreateSiteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sitesService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.sitesService.list(user);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sitesService.getById(id, user);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @RequireMfa()
  @AuditLog({ action: "site.update", resourceType: "site" })
  update(@Param("id") id: string, @Body() dto: UpdateSiteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sitesService.update(id, dto, user);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @RequireMfa()
  @AuditLog({ action: "site.delete", resourceType: "site" })
  softDelete(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sitesService.softDelete(id, user);
  }
}
