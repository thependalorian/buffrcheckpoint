import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { IsOptional, IsString, MinLength } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { RegionsService } from "./regions.service";

class CreateRegionDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;
}

class UpdateRegionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;
}

@Controller("regions")
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "region.create", resourceType: "region" })
  create(@Body() dto: CreateRegionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.regionsService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.regionsService.list(user);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.regionsService.getById(id, user);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "region.update", resourceType: "region" })
  update(@Param("id") id: string, @Body() dto: UpdateRegionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.regionsService.update(id, dto, user);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "region.delete", resourceType: "region" })
  softDelete(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.regionsService.softDelete(id, user);
  }
}
