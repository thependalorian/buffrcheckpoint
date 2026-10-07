import nodemailer, { type Transporter } from "nodemailer";

import type { EmailAttachmentPayload, NotificationChannelAdapter } from "./email.adapter";
import { SendBudget } from "./send-budget";
import type { SmtpConfig } from "./smtp-config";
import { randomUUID } from "node:crypto";

const ADDRESS = /^[^\s<>@"\r\n]+@[^\s<>@"\r\n]+\.[^\s<>@"\r\n]+$/;

/** One line, no control characters: a subject or name must never be able to add a header. */
export function cleanHeader(value: string, max = 200): string {
  return (
    value
      // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters and line breaks from a header is the point
      .replace(/[\r\n\u0000-\u001f\u007f]+/g, " ")
      .trim()
      .slice(0, max)
  );
}

export class EmailBudgetExhaustedError extends Error {
  constructor() {
    super("Email send budget for this hour or day is used up; the message waits in the outbox");
    this.name = "EmailBudgetExhaustedError";
  }
}

export interface SmtpAdapterDeps {
  transporter?: Transporter;
  budget?: SendBudget;
}

/**
 * Sends through a mailbox over SMTP (Namecheap Private Email by default: mail.privateemail.com, port 465, TLS). The same mailbox the
 * email agent uses, so Checkpoint mail comes from hello@buffr.ai. Plain text is canonical; HTML is an alternative part. No tracking pixels
 * and no links are rewritten.
 */
export class SmtpEmailAdapter implements NotificationChannelAdapter {
  readonly budget: SendBudget;
  private readonly transporter: Transporter;

  constructor(
    private readonly config: SmtpConfig,
    deps: SmtpAdapterDeps = {},
  ) {
    this.budget = deps.budget ?? new SendBudget({ perHour: config.perHour, perDay: config.perDay });
    this.transporter =
      deps.transporter ??
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.pass },
        connectionTimeout: config.timeoutMs,
        greetingTimeout: config.timeoutMs,
        socketTimeout: config.timeoutMs,
        pool: true,
        maxConnections: 2,
        maxMessages: 50,
      });
  }

  hasRoom(): boolean {
    return this.budget.hasRoom();
  }

  async send(
    recipientReference: string,
    message: string,
    options?: { subject?: string; html?: string; attachments?: EmailAttachmentPayload[] },
  ): Promise<{ delivered: boolean; providerReference?: string }> {
    const to = recipientReference.trim();
    if (!ADDRESS.test(to)) throw new Error("Recipient is not a valid email address");
    if (!this.budget.hasRoom()) throw new EmailBudgetExhaustedError();

    const messageId = `<${randomUUID()}@${this.config.domain}>`;
    await this.transporter.sendMail({
      from: this.config.from,
      to,
      replyTo: this.config.replyTo,
      subject: cleanHeader(options?.subject ?? "Buffr Checkpoint notification") || "Buffr Checkpoint notification",
      text: message,
      ...(options?.html ? { html: options.html } : {}),
      attachments: options?.attachments?.map((a) => ({
        filename: cleanHeader(a.filename, 120),
        content: Buffer.from(a.contentBase64, "base64"),
        contentType: a.contentType,
      })),
      messageId,
      // System mail: auto-responders and out-of-office replies must not answer it.
      headers: { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All" },
    });
    this.budget.record();
    return { delivered: true, providerReference: messageId };
  }
}
