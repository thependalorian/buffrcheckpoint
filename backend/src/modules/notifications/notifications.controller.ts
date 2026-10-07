import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { SmsEntitlementService } from "../integrations/telecoms/sms-entitlement.service";
import { currentBillingMonth, SMS_CURRENCY_CODE, usageAmount } from "../integrations/telecoms/sms-usage-billing";
import { SendNotificationDto } from "./dto/send-notification.dto";
import { NotificationPreferencesService } from "./notification-preferences.service";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferences: NotificationPreferencesService,
    private readonly smsEntitlement: SmsEntitlementService,
  ) {}

  /** The optional emails this organisation can switch on or off. Security, billing and verification mail always goes. */
  @Get("preferences")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.preferences.list(user.organisationId);
  }

  /** This organisation's text messages so far this month, what they cost at its price per text, and whether the SMS add-on is on. */
  @Get("sms-usage")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  async smsUsage(@CurrentUser() user: AuthenticatedUser) {
    const [addonActive, usage] = await Promise.all([
      this.smsEntitlement.hasActiveAddon(user.organisationId),
      this.smsEntitlement.usageFor(user.organisationId, currentBillingMonth()),
    ]);
    return {
      addonActive,
      ...usage,
      amount: usageAmount(usage.sent, usage.unitPrice),
      currencyCode: SMS_CURRENCY_CODE,
    };
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
