// BulkSMS Namibia (bulksmsnam.com) outbound SMS client. The provider publishes no API reference; the contract here is the two calls
// in the account dashboard (POST /api/v1/send, GET /api/v1/balance, both with an X-API-Key header) plus what the live API returned
// when it was exercised on 2026-10-07: a send answers { success, messageId, to, creditsUsed, creditsRemaining }, a balance answers
// { credits, email, name }. 1 credit = 1 SMS, so this client refuses a message that could use more than one segment
// rather than spending credits silently.

export const BULKSMSNAM_PROVIDER_CODE = "bulksmsnam";
const DEFAULT_BASE_URL = "https://bulksmsnam.com/api/v1";
const REQUEST_TIMEOUT_MS = 15_000;
/** One GSM-7 SMS segment. A longer text can cost several credits, so it is refused, not sent. */
export const SMS_MAX_CHARACTERS = 160;

export class SmsSendError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_configured"
      | "invalid_recipient"
      | "message_too_long"
      | "provider_rejected"
      | "provider_unreachable",
  ) {
    super(message);
  }
}

/**
 * Normalises a Namibian mobile number to E.164 (+264...). Accepts +264 81 123 4567, 264811234567, 0811234567 and 00264811234567.
 * Returns null for anything that is not a Namibian mobile number (MTC and TN Mobile numbers are 081, 085 and 083 followed by 7 digits).
 */
export function normaliseNamibianMobile(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  let national: string;
  if (/^\+264\d+$/.test(digits)) national = digits.slice(4);
  else if (/^00264\d+$/.test(digits)) national = digits.slice(5);
  else if (/^264\d+$/.test(digits)) national = digits.slice(3);
  else if (/^0\d+$/.test(digits)) national = digits.slice(1);
  else return null;
  return /^(81|83|85)\d{7}$/.test(national) ? `+264${national}` : null;
}

export interface BulkSmsSendResult {
  delivered: boolean;
  providerReference?: string;
  /** Credits left after this send, when the provider reports it. */
  creditsRemaining?: number;
}

export interface BulkSmsClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class BulkSmsNamClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: BulkSmsClientOptions = {}) {
    this.apiKey = (options.apiKey ?? process.env.BULK_SMS_API_KEY)?.trim() || undefined;
    this.baseUrl = (options.baseUrl ?? process.env.BULK_SMS_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  isConfigured(): boolean {
    return this.apiKey !== undefined;
  }

  private async call(path: string, init: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
    if (!this.apiKey) throw new SmsSendError("BULK_SMS_API_KEY is not set", "not_configured");
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: { "X-API-Key": this.apiKey, "Content-Type": "application/json", ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      // The message is deliberately generic: the request URL and headers carry the key, the body carries a phone number.
      throw new SmsSendError(
        `BulkSMS Namibia unreachable (${error instanceof Error ? error.name : "error"})`,
        "provider_unreachable",
      );
    }
    const text = await response.text();
    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = text ? JSON.parse(text) : {};
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch {
      /* non-JSON body: leave empty, the status code carries the outcome */
    }
    return { status: response.status, body };
  }

  /** Credits left on the account. Free to call. */
  async balance(): Promise<number> {
    const { status, body } = await this.call("/balance", { method: "GET" });
    if (status !== 200 || typeof body.credits !== "number") {
      throw new SmsSendError(`BulkSMS Namibia balance check failed (HTTP ${status})`, "provider_rejected");
    }
    return body.credits;
  }

  /** Sends one SMS. Throws SmsSendError for anything that is not a confirmed hand-off to the provider. */
  async send(recipient: string, message: string): Promise<BulkSmsSendResult> {
    const to = normaliseNamibianMobile(recipient);
    if (!to) throw new SmsSendError("Recipient is not a Namibian mobile number", "invalid_recipient");
    if (message.length === 0 || message.length > SMS_MAX_CHARACTERS) {
      throw new SmsSendError(`Message must be 1 to ${SMS_MAX_CHARACTERS} characters`, "message_too_long");
    }
    const { status, body } = await this.call("/send", { method: "POST", body: JSON.stringify({ to, message }) });
    if (status < 200 || status >= 300 || body.success === false || body.error !== undefined) {
      throw new SmsSendError(`BulkSMS Namibia rejected the message (HTTP ${status})`, "provider_rejected");
    }
    const reference = body.messageId;
    return {
      delivered: true,
      providerReference: reference === undefined ? undefined : String(reference),
      creditsRemaining: typeof body.creditsRemaining === "number" ? body.creditsRemaining : undefined,
    };
  }
}
