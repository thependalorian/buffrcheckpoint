import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateHostDto } from "./dto/create-host.dto";
import { HostsService } from "./hosts.service";

class UpdateHostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  contactReference?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsUUID()
  organisationUnitId?: string | null;
}

@Controller("hosts")
export class HostsController {
  constructor(private readonly hostsService: HostsService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  create(@Body() dto: CreateHostDto, @CurrentUser() user: AuthenticatedUser) {
    return this.hostsService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  listBySite(
    @Query("siteId") siteId: string | undefined,
    @Query("q") q: string | undefined,
    @Query("limit") limit: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // With ?q= (even empty) the list is the check-in picker: active hosts only, ranked, capped. Without it, the full admin list.
    return this.hostsService.listBySite(
      siteId,
      user,
      q === undefined ? undefined : { q, limit: limit ? Number(limit) : undefined },
    );
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.hostsService.getById(id, user);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "host.update", resourceType: "site_host" })
  update(@Param("id") id: string, @Body() dto: UpdateHostDto, @CurrentUser() user: AuthenticatedUser) {
    return this.hostsService.update(id, dto, user);
  }
}
