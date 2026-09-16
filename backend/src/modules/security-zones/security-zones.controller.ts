import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { SecurityZonesService } from "./security-zones.service";

class CreateZoneDto {
  @IsUUID()
  siteId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  zoneCode?: string;

  @IsOptional()
  @IsBoolean()
  hostApprovalRequired?: boolean;
}

class UpdateZoneDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  zoneCode?: string;

  @IsOptional()
  @IsBoolean()
  hostApprovalRequired?: boolean;
}

@Controller("security-zones")
export class SecurityZonesController {
  constructor(private readonly zonesService: SecurityZonesService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "security_zone.create", resourceType: "security_zone" })
  create(@Body() dto: CreateZoneDto, @CurrentUser() user: AuthenticatedUser) {
    return this.zonesService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  list(@Query("siteId") siteId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.zonesService.list(siteId, user);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.zonesService.getById(id, user);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "security_zone.update", resourceType: "security_zone" })
  update(@Param("id") id: string, @Body() dto: UpdateZoneDto, @CurrentUser() user: AuthenticatedUser) {
    return this.zonesService.update(id, dto, user);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "security_zone.delete", resourceType: "security_zone" })
  softDelete(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.zonesService.softDelete(id, user);
  }
}
