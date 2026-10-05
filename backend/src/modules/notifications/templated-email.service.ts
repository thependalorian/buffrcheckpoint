import { Injectable, Logger } from "@nestjs/common";

import { PlatformNotificationTemplateService } from "../platform-configuration/platform-notification-template.service";
import { brandedEmailLayout } from "./branded-email-layout";
import { type EmailAttachment, NotificationsService, type SendNotificationInput } from "./notifications.service";

export interface SendTemplatedEmailInput {
  templateCode: string;
  organisationId: string;
  to: string;
  variables: Record<string, string>;
  fallback: { subject: string; body: string };
  visitId?: string;
  attachments?: EmailAttachment[];
  /** Appended after template body (e.g. free-text note). */
  bodySuffix?: string;
  /** When set, skip branded HTML wrapper. */
  customHtml?: string;
}

/**
 * Renders ops-editable platform_notification_template rows, wraps plain text
 * in the Buffr Checkpoint brand shell, and enqueues via the notification outbox.
 */
@Injectable()
export class TemplatedEmailService {
  private readonly logger = new Logger(TemplatedEmailService.name);

  constructor(
    private readonly templates: PlatformNotificationTemplateService,
    private readonly notifications: NotificationsService,
  ) {}

  async send(input: SendTemplatedEmailInput) {
    const rendered = await this.templates.render(input.templateCode, input.variables, input.fallback);
    const body = input.bodySuffix ? `${rendered.body}${input.bodySuffix}` : rendered.body;
    const html =
      input.customHtml ??
      brandedEmailLayout({
        title: rendered.subject,
        bodyText: body,
        preheader: rendered.subject,
      });

    const payload: SendNotificationInput & { organisationId: string; attachments?: EmailAttachment[] } = {
      organisationId: input.organisationId,
      channelCode: "email",
      recipientReference: input.to,
      subject: rendered.subject,
      message: body,
      html,
      visitId: input.visitId,
      attachments: input.attachments,
    };

    try {
      return await this.notifications.sendForOrganisation(payload);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Templated email enqueue failed [${input.templateCode}] to=${input.to}: ${detail}`);
      return null;
    }
  }

  /** Resolve CONTACT_OPS_EMAIL (or Resend from-address mailbox) for ops intake. */
  static resolveOpsInbox(): string | null {
    const raw = process.env.CONTACT_OPS_EMAIL ?? process.env.RESEND_FROM_EMAIL;
    if (!raw?.trim()) return null;
    if (raw.includes("<")) {
      return raw.match(/<([^>]+)>/)?.[1]?.trim() ?? null;
    }
    return raw.trim();
  }
}
