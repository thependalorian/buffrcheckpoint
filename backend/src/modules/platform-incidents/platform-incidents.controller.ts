import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { BreachNoticeService } from "./breach-notice.service";
import {
  type CreateIncidentInput,
  PlatformIncidentsService,
  type UpdateIncidentStatusInput,
} from "./platform-incidents.service";

class BreachNoticeDto {
  @IsUUID()
  organisationId!: string;
  @IsString() @MinLength(10) @MaxLength(1000) whatHappened!: string;
  @IsString() @MinLength(3) @MaxLength(200) whenDiscovered!: string;
  @IsString() @MinLength(5) @MaxLength(1000) dataAffected!: string;
  @IsString() @MinLength(1) @MaxLength(200) peopleAffected!: string;
  @IsString() @MinLength(5) @MaxLength(1000) consequences!: string;
  @IsString() @MinLength(5) @MaxLength(1000) measures!: string;
}

@Controller("platform/incidents")
export class PlatformIncidentsController {
  constructor(
    private readonly service: PlatformIncidentsService,
    private readonly breachNotice: BreachNoticeService,
  ) {}

  /** Tells one customer's administrators about a personal data breach (draft Bill s22(3)). Staff decide; nothing sends automatically. */
  @Post("breach-notice")
  @PlatformScoped()
  @RequirePermission(PERMISSIONS.PLATFORM_INCIDENT_MANAGE)
  @AuditLog({ action: "platform_incident.breach_notice", resourceType: "organisation" })
  notifyBreach(@Body() dto: BreachNoticeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.breachNotice.notify(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermission(PERMISSIONS.PLATFORM_INCIDENT_MANAGE)
  @AuditLog({ action: "platform_incident.create", resourceType: "platform_incident" })
  create(@Body() dto: CreateIncidentInput, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Patch("status")
  @RequirePermission(PERMISSIONS.PLATFORM_INCIDENT_MANAGE)
  @AuditLog({ action: "platform_incident.update_status", resourceType: "platform_incident" })
  updateStatus(@Body() dto: UpdateIncidentStatusInput, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateStatus(dto, user);
  }

  @Patch("bulk-status")
  @RequirePermission(PERMISSIONS.PLATFORM_INCIDENT_MANAGE)
  @AuditLog({ action: "platform_incident.update_status_bulk", resourceType: "platform_incident" })
  updateStatusBulk(
    @Body() body: { incidentIds: string[]; statusCode: string; note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatusBulk(body.incidentIds ?? [], body.statusCode, user, body.note);
  }

  @Get(":incidentId")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  getById(@Param("incidentId") incidentId: string) {
    return this.service.getById(incidentId);
  }

  @Get(":incidentId/status-history")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  statusHistory(@Param("incidentId") incidentId: string) {
    return this.service.statusHistory(incidentId);
  }

  @Get(":incidentId/affected-organisations")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  affectedOrganisations(@Param("incidentId") incidentId: string) {
    return this.service.listAffectedOrganisations(incidentId);
  }
}
