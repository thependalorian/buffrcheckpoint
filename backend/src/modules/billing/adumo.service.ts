import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { randomBytes } from "node:crypto";

export interface AdumoConfig {
  merchantId: string;
  applicationId: string;
  jwtSecret: string;
  baseUrl: string;
  returnUrl: string;
  notifyUrl: string | null;
}

export interface AdumoCheckout {
  actionUrl: string;
  fields: Record<string, string>;
}

export interface AdumoResponseClaims {
  result: number;
  transactionIndex: string;
  mref: string;
  amount: string;
  cuid: string;
  auid: string;
}

/** Formats an amount the way Adumo expects (decimal 6.2, as a string). */
export function adumoAmount(amount: string | number): string {
  return Number(amount).toFixed(2);
}

/** Loads Adumo settings from the environment, or null when card payments are not configured. */
export function adumoConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AdumoConfig | null {
  const merchantId = env.ADUMO_MERCHANT_ID?.trim();
  const applicationId = env.ADUMO_APPLICATION_ID?.trim();
  const jwtSecret = env.ADUMO_JWT_SECRET?.trim();
  if (!merchantId || !applicationId || !jwtSecret) return null;
  const adminBase = (env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
  return {
    merchantId,
    applicationId,
    jwtSecret,
    baseUrl: (env.ADUMO_BASE_URL ?? "https://apiv3.adumoonline.com").replace(/\/$/, ""),
    returnUrl: `${adminBase}/api/billing/card-payment/return`,
    notifyUrl: env.ADUMO_NOTIFY_URL?.trim() || null,
  };
}

// Adumo Online "Virtual" hosted payment page. Checkpoint never sees card
// details: it posts a signed request (HS256 JWT carrying merchant, app,
// reference and amount) to Adumo's page, and later trusts a result only after
// verifying Adumo's signed _RESPONSE_TOKEN with the same secret. The posted
// _RESULT field alone is never trusted (Adumo: skipping these checks can lead
// to financial loss). https://developers.adumoonline.com/virtual.php
@Injectable()
export class AdumoService {
  // Standalone signer: Adumo's secret is separate from the session JWT secret.
  private readonly jwt = new JwtService();

  private config(): AdumoConfig {
    const config = adumoConfigFromEnv();
    if (!config) throw new ServiceUnavailableException("Card payments are not configured");
    return config;
  }

  isConfigured(): boolean {
    return adumoConfigFromEnv() !== null;
  }

  /** Builds the form post for Adumo's hosted page. `merchantReference` is our payment_transaction id (≤38 chars). */
  buildCheckout(merchantReference: string, amount: string, description: string): AdumoCheckout {
    const config = this.config();
    const now = Math.floor(Date.now() / 1000);
    const formattedAmount = adumoAmount(amount);
    const token = this.jwt.sign(
      {
        iss: "Buffr Checkpoint",
        cuid: config.merchantId,
        auid: config.applicationId,
        amount: formattedAmount,
        mref: merchantReference,
        jti: randomBytes(32).toString("base64"),
        iat: now - 60,
        exp: now + 600,
        ...(config.notifyUrl ? { notificationURL: config.notifyUrl } : {}),
      },
      { secret: config.jwtSecret, algorithm: "HS256" },
    );
    return {
      actionUrl: `${config.baseUrl}/product/payment/v1/initialisevirtual`,
      fields: {
        MerchantID: config.merchantId,
        ApplicationID: config.applicationId,
        MerchantReference: merchantReference,
        Amount: formattedAmount,
        Token: token,
        RedirectSuccessfulURL: config.returnUrl,
        RedirectFailedURL: config.returnUrl,
        OrderDescription: description.slice(0, 255),
      },
    };
  }

  /**
   * Verifies Adumo's response token: HS256 signature with our secret, not
   * expired, and issued for our merchant and application. Returns the claims;
   * the caller still checks reference and amount against its own record.
   */
  verifyResponseToken(token: string | undefined): AdumoResponseClaims {
    const config = this.config();
    if (!token) throw new UnauthorizedException("Missing payment response token");
    let claims: Record<string, unknown>;
    try {
      claims = this.jwt.verify<Record<string, unknown>>(token, { secret: config.jwtSecret, algorithms: ["HS256"] });
    } catch {
      throw new UnauthorizedException("Invalid payment response token");
    }
    const same = (a: unknown, b: string) => typeof a === "string" && a.toUpperCase() === b.toUpperCase();
    if (!same(claims.cuid, config.merchantId) || !same(claims.auid, config.applicationId)) {
      throw new UnauthorizedException("Payment response token is for a different merchant");
    }
    if (typeof claims.mref !== "string" || typeof claims.transactionIndex !== "string") {
      throw new UnauthorizedException("Payment response token is incomplete");
    }
    return {
      result: Number(claims.result),
      transactionIndex: claims.transactionIndex,
      mref: claims.mref,
      amount: String(claims.amount),
      cuid: String(claims.cuid),
      auid: String(claims.auid),
    };
  }
}
