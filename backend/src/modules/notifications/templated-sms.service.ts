import { Injectable, Logger } from "@nestjs/common";

import { normaliseNamibianMobile } from "../integrations/telecoms/bulksmsnam.client";
import { SmsEntitlementService } from "../integrations/telecoms/sms-entitlement.service";
import { PlatformNotificationTemplateService } from "../platform-configuration/platform-notification-template.service";
import { NotificationPreferencesService } from "./notification-preferences.service";
import { NotificationsService } from "./notifications.service";
import { smsSpecFor } from "./sms-template-catalog";
import { fitSms } from "./sms-text";

export interface SendTemplatedSmsInput {
  templateCode: string;
  organisationId: string;
  /** The mobile number as the visitor typed it. Anything that is not a Namibian mobile is refused. */
  to: string;
  variables: Record<string, string>;
  visitId?: string;
}

export type SmsNotQueuedReason =
  | "unknown_template"
  | "switched_off"
  | "invalid_recipient"
  | "addon_not_active"
  | "monthly_limit_reached"
  | "too_long";

export type TemplatedSmsResult = { queued: true } | { queued: false; reason: SmsNotQueuedReason };

/**
 * Renders an ops-editable SMS template and queues it on the notification outbox. A text costs money, so before anything is queued it
 * must pass: the organisation's own switch, a valid Namibian mobile number, the SMS add-on, a month under the safety limit, and
 * a rendered length of one 160-character segment. The same entitlement is checked again at delivery, which is the authority; this check
 * only stops doomed messages from being queued.
 */
@Injectable()
export class TemplatedSmsService {
  private readonly logger = new Logger(TemplatedSmsService.name);

  constructor(
    private readonly templates: PlatformNotificationTemplateService,
    private readonly notifications: NotificationsService,
    private readonly preferences: NotificationPreferencesService,
    private readonly entitlement: SmsEntitlementService,
  ) {}

  async send(input: SendTemplatedSmsInput): Promise<TemplatedSmsResult> {
    const spec = smsSpecFor(input.templateCode);
    if (!spec) return { queued: false, reason: "unknown_template" };
    if (!(await this.preferences.isEnabled(input.organisationId, input.templateCode))) {
      return { queued: false, reason: "switched_off" };
    }
    const to = normaliseNamibianMobile(input.to);
    if (!to) return { queued: false, reason: "invalid_recipient" };

    const entitlement = await this.entitlement.check(input.organisationId);
    if (!entitlement.allowed && entitlement.reason) return { queued: false, reason: entitlement.reason };

    const body = await this.templates.rawBody(input.templateCode, spec.defaultBody, "sms");
    const fitted = fitSms(body, input.variables);
    if (!fitted) {
      // The message cannot be sent in one segment; sending it anyway would cost several credits. Say so loudly: nobody else is told.
      this.logger.error(`SMS not queued [${input.templateCode}]: rendered text does not fit one 160-character message`);
      return { queued: false, reason: "too_long" };
    }

    await this.notifications.sendForOrganisation({
      organisationId: input.organisationId,
      channelCode: "sms",
      recipientReference: to,
      message: fitted.text,
      visitId: input.visitId,
    });
    return { queued: true };
  }
}
