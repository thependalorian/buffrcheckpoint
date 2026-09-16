import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { SendNotificationDto } from "./dto/send-notification.dto";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
