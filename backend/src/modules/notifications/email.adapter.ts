// Section 11.2 Messaging adapter. SMTP through the Buffr mailbox (team@buffranalytics.com) when SMTP_USER and SMTP_PASS are set; Resend
// when chosen (EMAIL_TRANSPORT=resend), when SMTP is not configured, or as the live fallback if the chosen transport fails;
// otherwise an honest failure (never a fake "sent").

import { chooseTransport, smtpConfigFromEnv } from "./smtp-config";
import { EmailBudgetExhaustedError, SmtpEmailAdapter } from "./smtp-email.adapter";

export interface EmailAttachmentPayload {
  filename: string;
  /** Base64-encoded file bytes */
  contentBase64: string;
  contentType: string;
}

export interface NotificationChannelAdapter {
  send(
    recipientReference: string,
    message: string,
    options?: {
      subject?: string;
      html?: string;
      attachments?: EmailAttachmentPayload[];
    },
  ): Promise<{ delivered: boolean; providerReference?: string }>;
}

export class UnconfiguredEmailAdapter implements NotificationChannelAdapter {
  async send(
    _recipientReference: string,
    _message: string,
  ): Promise<{ delivered: boolean; providerReference?: string }> {
    throw new Error(
      "No email provider is configured (set SMTP_USER and SMTP_PASS, or RESEND_API_KEY). " +
        "This adapter deliberately refuses to pretend a notification was sent — " +
        "see buffrcheckpoint.md §9.2.",
    );
  }
}

/**
 * Sends through the first transport that works, in preference order. A transport that is configured but unreachable (observed
 * 2026-10-07: SMTP sign-in timing out, five attempts, every message dead) must not take every email down with it when the other
 * provider is configured and healthy — account mail has to leave. If both fail, the first transport's error is what the caller sees.
 */
export class FallbackEmailAdapter implements NotificationChannelAdapter {
  constructor(
    readonly primary: NotificationChannelAdapter,
    readonly secondary: NotificationChannelAdapter,
    /** Called with the primary transport's error when the message goes out through the fallback instead. */
    readonly onFallback: (error: unknown) => void = (error) => {
      console.warn(
        `Email transport failed, sending through the fallback instead: ${error instanceof Error ? error.message : String(error)}`,
      );
    },
  ) {}

  /** True while any transport can still take mail; a budgeted transport counts only when its own budget has room. */
  hasRoom(): boolean {
    for (const adapter of [this.primary, this.secondary]) {
      if (!hasRoomCheck(adapter)) return true;
      if (adapter.hasRoom()) return true;
    }
    return false;
  }

  async send(
    recipientReference: string,
    message: string,
    options?: {
      subject?: string;
      html?: string;
      attachments?: EmailAttachmentPayload[];
    },
  ): Promise<{ delivered: boolean; providerReference?: string }> {
    const errors: unknown[] = [];
    let budgetExhausted = false;
    for (const adapter of [this.primary, this.secondary]) {
      try {
        return await adapter.send(recipientReference, message, options);
      } catch (error) {
        // Out of this mailbox's hourly/daily cap: the message is not failing, it is waiting — try the other transport, and only
        // report budget exhaustion if no transport at all could take it.
        if (error instanceof EmailBudgetExhaustedError) budgetExhausted = true;
        else {
          errors.push(error);
          this.onFallback(error);
        }
      }
    }
    if (errors.length === 0 && budgetExhausted) throw new EmailBudgetExhaustedError();
    throw errors[0];
  }
}

function hasRoomCheck(
  adapter: NotificationChannelAdapter,
): adapter is NotificationChannelAdapter & { hasRoom(): boolean } {
  return "hasRoom" in adapter && typeof adapter.hasRoom === "function";
}

export class ResendEmailAdapter implements NotificationChannelAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string,
  ) {}

  async send(
    recipientReference: string,
    message: string,
    options?: {
      subject?: string;
      html?: string;
      attachments?: EmailAttachmentPayload[];
    },
  ): Promise<{ delivered: boolean; providerReference?: string }> {
    const attachments = options?.attachments?.map((a) => ({
      filename: a.filename,
      content: a.contentBase64,
      type: a.contentType,
    }));

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: [recipientReference],
        subject: options?.subject ?? "Buffr Checkpoint notification",
        text: message,
        ...(options?.html ? { html: options.html } : {}),
        ...(attachments?.length ? { attachments } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend delivery failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as { id?: string };
    return { delivered: true, providerReference: payload.id };
  }
}

/** SMTP when its credentials work; Resend when its key is set. Neither builder throws: a half-configured transport (for
 * example EMAIL_TRANSPORT=smtp with no SMTP_PASS) must degrade to the other transport instead of refusing to boot the app. */
function smtpAdapter(env: NodeJS.ProcessEnv): NotificationChannelAdapter | null {
  try {
    return new SmtpEmailAdapter(smtpConfigFromEnv(env));
  } catch {
    return null;
  }
}

function resendAdapter(env: NodeJS.ProcessEnv): NotificationChannelAdapter | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new ResendEmailAdapter(
    apiKey,
    env.RESEND_FROM_EMAIL?.trim() ?? "Buffr Checkpoint <onboarding@buffrcheckpoint.com>",
  );
}

export function createEmailAdapter(env: NodeJS.ProcessEnv = process.env): NotificationChannelAdapter {
  const transport = chooseTransport(env);
  if (transport === "none") return new UnconfiguredEmailAdapter();

  const smtp = smtpAdapter(env);
  const resend = resendAdapter(env);
  const ordered = (transport === "smtp" ? [smtp, resend] : [resend, smtp]).filter(
    (adapter): adapter is NotificationChannelAdapter => adapter !== null,
  );
  if (ordered.length === 0) return new UnconfiguredEmailAdapter();
  if (ordered.length === 1) return ordered[0];
  return new FallbackEmailAdapter(ordered[0], ordered[1]);
}
