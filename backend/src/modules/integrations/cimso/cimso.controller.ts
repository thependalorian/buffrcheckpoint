import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsOptional, IsUUID } from "class-validator";

import { AuditLog } from "../../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../../common/rbac/permissions";
import {
  CimsoConnectDto,
  CimsoFrontDeskIngestDto,
  CimsoIntegrationService,
  CimsoSyncReservationsDto,
} from "./cimso-integration.service";

class CimsoStatusQueryDto {
  @IsOptional()
  @IsUUID()
  siteId?: string;
}

class CimsoMappingsQueryDto {
  @IsOptional()
  @IsUUID()
  siteId?: string;
}

@Controller("integrations/cimso")
export class CimsoController {
  constructor(private readonly cimso: CimsoIntegrationService) {}

  @Get("status")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  status(@CurrentUser() user: AuthenticatedUser, @Query() query: CimsoStatusQueryDto) {
    return this.cimso.getStatus(user, query.siteId);
  }

  @Post("connect")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "cimso.connect", resourceType: "integration" })
  connect(@Body() dto: CimsoConnectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cimso.connect(dto, user);
  }

  @Post("sync/reservations")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "cimso.sync_reservations", resourceType: "integration" })
  syncReservations(@Body() dto: CimsoSyncReservationsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cimso.syncReservations(dto, user);
  }

  @Post("events/front-desk")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "cimso.front_desk_ingest", resourceType: "integration" })
  ingestFrontDesk(@Body() dto: CimsoFrontDeskIngestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cimso.ingestFrontDeskEvent(dto, user);
  }

  @Get("mappings")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  mappings(@CurrentUser() user: AuthenticatedUser, @Query() query: CimsoMappingsQueryDto) {
    return this.cimso.listMappings(user, query.siteId);
  }
}
