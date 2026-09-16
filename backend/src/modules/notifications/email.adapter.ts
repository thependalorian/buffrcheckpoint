// Section 11.2 Messaging adapter — real Resend implementation when
// RESEND_API_KEY is set; otherwise honest failure (never fake "sent").

export interface NotificationChannelAdapter {
  send(
    recipientReference: string,
    message: string,
    options?: { subject?: string; html?: string },
  ): Promise<{ delivered: boolean; providerReference?: string }>;
}

export class UnconfiguredEmailAdapter implements NotificationChannelAdapter {
  async send(
    _recipientReference: string,
    _message: string,
  ): Promise<{ delivered: boolean; providerReference?: string }> {
    throw new Error(
      "No email provider is configured (RESEND_API_KEY unset). " +
        "This adapter deliberately refuses to pretend a notification was sent — " +
        "see buffrcheckpoint.md Section 11.8.4.",
    );
  }
}

export class ResendEmailAdapter implements NotificationChannelAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string,
  ) {}

  async send(
    recipientReference: string,
    message: string,
    options?: { subject?: string; html?: string },
  ): Promise<{ delivered: boolean; providerReference?: string }> {
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

export function createEmailAdapter(): NotificationChannelAdapter {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = process.env.RESEND_FROM_EMAIL?.trim() ?? "Buffr Checkpoint <onboarding@buffrcheckpoint.com>";
  if (!apiKey) {
    return new UnconfiguredEmailAdapter();
  }
  return new ResendEmailAdapter(apiKey, fromAddress);
}
