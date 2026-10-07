import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { SendNotificationDto } from "./dto/send-notification.dto";
import { NotificationPreferencesService } from "./notification-preferences.service";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferences: NotificationPreferencesService,
  ) {}

  /** The optional emails this organisation can switch on or off. Security, billing and verification mail always goes. */
  @Get("preferences")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.preferences.list(user.organisationId);
  }

  @Put("preferences")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "notification_preferences.update", resourceType: "organisation" })
  updatePreferences(
    @Body() body: { changes: Array<{ templateCode: string; enabled: boolean }> },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.preferences.update(user.organisationId, body?.changes ?? [], user);
  }

  @Post()
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  send(@Body() dto: SendNotificationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.send(dto, user);
  }

  @Get("visit/:visitId")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  listForVisit(@Param("visitId") visitId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listForVisit(visitId, user);
  }
}
