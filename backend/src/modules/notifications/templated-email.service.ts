import { Injectable, Logger } from "@nestjs/common";

import { PlatformNotificationTemplateService } from "../platform-configuration/platform-notification-template.service";
import { brandedEmailLayout } from "./branded-email-layout";
import { cleanName, composePlainText, greetingLine, hasGreeting, signatureFor } from "./email-compose";
import { NotificationPreferencesService } from "./notification-preferences.service";
import { type EmailAttachment, NotificationsService, type SendNotificationInput } from "./notifications.service";
import { picturesFor, specFor } from "./template-catalog";

export interface SendTemplatedEmailInput {
  templateCode: string;
  organisationId: string;
  to: string;
  variables: Record<string, string>;
  fallback: { subject: string; body: string };
  visitId?: string;
  attachments?: EmailAttachment[];
  /** The recipient's name when known, for "Hello Maria,". Without it the greeting is just "Hello,". */
  recipientName?: string | null;
  /** Signs as a named person ("Maria Shikongo, Buffr Checkpoint Support") instead of the team. Falls back to the team signature when the name is not usable. */
  signedBy?: { name: string; role?: string };
  /** Appended after template body (e.g. free-text note). */
  bodySuffix?: string;
  /** When set, skip branded HTML wrapper. */
  customHtml?: string;
}

/**
 * Renders ops-editable platform_notification_template rows, wraps plain text
 * in the Buffr Checkpoint brand shell, and enqueues via the notification outbox.
 */
function websiteBase(): string {
  return (process.env.PUBLIC_WEBSITE_BASE_URL?.trim() || "https://buffrcheckpoint.com").replace(/\/$/, "");
}

@Injectable()
export class TemplatedEmailService {
  private readonly logger = new Logger(TemplatedEmailService.name);

  constructor(
    private readonly templates: PlatformNotificationTemplateService,
    private readonly notifications: NotificationsService,
    private readonly preferences: NotificationPreferencesService,
  ) {}

  async send(input: SendTemplatedEmailInput) {
    // Optional mail an organisation has switched off is not sent. Security, billing and verification mail always is.
    if (!(await this.preferences.isEnabled(input.organisationId, input.templateCode))) return null;
    const rendered = await this.templates.render(input.templateCode, input.variables, input.fallback);
    const body = input.bodySuffix ? `${rendered.body}${input.bodySuffix}` : rendered.body;
    const spec = specFor(input.templateCode);
    // Internal alerts to ops are not letters: no greeting and no signature.
    const internal = spec?.audience === "ops_inbox" || spec?.signature === "none";
    const greeting = internal || hasGreeting(body) ? null : greetingLine(input.recipientName);
    const person = input.signedBy ? cleanName(input.signedBy.name) : null;
    const signature = internal
      ? null
      : person
        ? { name: person, role: input.signedBy?.role ?? signatureFor(spec?.signature)?.name }
        : signatureFor(spec?.signature);
    const pictures = internal ? null : picturesFor(input.templateCode);
    const html =
      input.customHtml ??
      brandedEmailLayout({
        title: rendered.subject,
        bodyText: body,
        preheader: spec?.preheader ?? rendered.subject,
        actionLabel: spec?.actionLabel,
        heroImage: pictures ? { url: `${websiteBase()}/email/${pictures.hero.file}`, alt: pictures.hero.alt } : null,
        greeting,
        signature,
      });
    // The plain text is the canonical message: it carries the same greeting and signature as the HTML.
    const text = internal ? body : composePlainText({ greeting, body, signature });

    const payload: SendNotificationInput & { organisationId: string; attachments?: EmailAttachment[] } = {
      organisationId: input.organisationId,
      channelCode: "email",
      recipientReference: input.to,
      subject: rendered.subject,
      message: text,
      html,
      visitId: input.visitId,
      attachments: input.attachments,
    };

    try {
      return await this.notifications.sendForOrganisation(payload);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      // Error, not warn: this is a message the recipient will simply never receive, and nobody is told.
      this.logger.error(`Templated email enqueue failed [${input.templateCode}] to=${input.to}: ${detail}`);
      return null;
    }
  }

  /** Resolve CONTACT_OPS_EMAIL (or Resend from-address mailbox) for ops intake. */
  static resolveOpsInbox(): string | null {
    // Ops mail goes to the Buffr mailbox unless CONTACT_OPS_EMAIL names another inbox.
    const raw =
      process.env.CONTACT_OPS_EMAIL ??
      process.env.PUBLIC_CONTACT_EMAIL ??
      process.env.EMAIL_REPLY_TO ??
      process.env.SMTP_USER ??
      process.env.RESEND_FROM_EMAIL;
    if (!raw?.trim()) return null;
    if (raw.includes("<")) {
      return raw.match(/<([^>]+)>/)?.[1]?.trim() ?? null;
    }
    return raw.trim();
  }
}
