import { Injectable, Logger } from "@nestjs/common";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 4000;

export type TurnstileOutcome = "passed" | "failed" | "unavailable";

/**
 * Checks the Cloudflare Turnstile token a browser sends with a public form. Off until `TURNSTILE_SECRET_KEY` is set, so nothing changes
 * until the keys are in place. Only the token and the secret are sent to Cloudflare: not the visitor's address, not the form.
 *
 * "Unavailable" means Cloudflare could not be reached. The guard lets that through and writes a warning, because the routes it protects
 * also have throttles, lockout and (after go-live) MFA, and a Cloudflare outage must not lock every customer out of signing in.
 * A token that Cloudflare says is wrong is "failed" and is always refused.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  isEnabled(): boolean {
    return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
  }

  async verify(token: string | undefined): Promise<TurnstileOutcome> {
    const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
    if (!secret) return "passed";
    if (!token || token.length > 2048) return "failed";
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status >= 500) {
        this.logger.warn(`Turnstile siteverify answered ${response.status}; letting the request through`);
        return "unavailable";
      }
      const body = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
      if (body.success === true) return "passed";
      this.logger.log(`Turnstile refused a token: ${(body["error-codes"] ?? []).join(",") || "no reason given"}`);
      return "failed";
    } catch (error) {
      this.logger.warn(`Turnstile could not be reached (${error instanceof Error ? error.message : "unknown error"}); letting the request through`);
      return "unavailable";
    }
  }
}
