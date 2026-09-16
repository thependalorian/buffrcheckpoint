import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { OrganisationDirectoryService, type DirectoryModeCode } from "./organisation-directory.service";

class SetDirectoryModeDto {
  @IsIn(["custom", "bian_aligned", "hybrid"])
  modeCode!: DirectoryModeCode;
}

class CreateUnitDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsString()
  @MinLength(1)
  unitKindCode!: string;

  @IsOptional()
  @IsString()
  bianAreaCode?: string | null;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsUUID()
  siteId?: string | null;
}

class UpdateUnitDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  unitKindCode?: string;

  @IsOptional()
  @IsString()
  bianAreaCode?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsUUID()
  siteId?: string | null;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

@Controller("organisation-directory")
export class OrganisationDirectoryController {
  constructor(private readonly directory: OrganisationDirectoryService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  getDirectory(@CurrentUser() user: AuthenticatedUser) {
    return this.directory.getDirectory(user);
  }

  @Post("mode")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "organisation_directory.set_mode", resourceType: "organisation_settings" })
  setMode(@Body() dto: SetDirectoryModeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.directory.setMode(dto.modeCode, user);
  }

  @Post("units")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "organisation_directory.create_unit", resourceType: "organisation_unit" })
  createUnit(@Body() dto: CreateUnitDto, @CurrentUser() user: AuthenticatedUser) {
    return this.directory.createUnit(dto, user);
  }

  @Patch("units/:id")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "organisation_directory.update_unit", resourceType: "organisation_unit" })
  updateUnit(@Param("id") id: string, @Body() dto: UpdateUnitDto, @CurrentUser() user: AuthenticatedUser) {
    return this.directory.updateUnit(id, dto, user);
  }

  /** Opt-in BIAN Service Landscape starter — never applied automatically. */
  @Post("seed/bian-template")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "organisation_directory.seed_bian", resourceType: "organisation_unit" })
  seedBian(@CurrentUser() user: AuthenticatedUser) {
    return this.directory.seedBianTemplate(user);
  }

  /** Opt-in flat departments for orgs that do not follow BIAN. */
  @Post("seed/custom-starter")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "organisation_directory.seed_custom", resourceType: "organisation_unit" })
  seedCustom(@CurrentUser() user: AuthenticatedUser) {
    return this.directory.seedCustomStarter(user);
  }
}
