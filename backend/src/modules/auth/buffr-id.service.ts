import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";

/**
 * How long the old email-and-password sign-in stays open (LEGACY_PASSWORD_AUTH):
 *  - "on" (default): everything works as before, next to Buffr ID.
 *  - "kiosk": password sign-in only for front-desk operator accounts (kiosks have no device credential yet); owners, managers and
 *    platform staff use Buffr ID, and sign-up and password reset go through Buffr ID.
 *  - "off": no password sign-in at all.
 */
export type LegacyPasswordMode = "on" | "kiosk" | "off";
export const KIOSK_OPERATOR_ROLE = "front_desk_operator";

export function legacyPasswordMode(env: NodeJS.ProcessEnv = process.env): LegacyPasswordMode {
  const value = (env.LEGACY_PASSWORD_AUTH ?? "on").trim().toLowerCase();
  return value === "kiosk" || value === "off" ? value : "on";
}

/** May this role still use the password door? */
export function legacyPasswordAllowedForRole(
  roleCode: string | null,
  mode: LegacyPasswordMode = legacyPasswordMode(),
): boolean {
  if (mode === "on") return true;
  if (mode === "off") return false;
  return roleCode === KIOSK_OPERATOR_ROLE;
}

export type SignInSurface = "admin" | "ops";

export interface BuffrIdIdentity {
  subject: string;
  email: string;
  /** Whether the Buffr ID account has two-step sign-in enabled (custom claim `two_factor_enabled`). */
  twoFactorEnabled: boolean;
}

export interface BuffrIdConfig {
  issuer: string;
  clientIds: Record<SignInSurface, string>;
}

/** Read from the environment each call so tests and rotations do not need a restart. Null when Buffr ID sign-in is not configured. */
export function buffrIdConfig(env: NodeJS.ProcessEnv = process.env): BuffrIdConfig | null {
  const issuer = env.BUFFR_ID_ISSUER?.trim().replace(/\/$/, "");
  const admin = env.BUFFR_ID_CLIENT_ID_ADMIN?.trim();
  const ops = env.BUFFR_ID_CLIENT_ID_OPS?.trim();
  if (!issuer || !admin || !ops) return null;
  return { issuer, clientIds: { admin, ops } };
}

/**
 * Verifies a Buffr ID ID token: signature against the issuer's published keys (EdDSA), issuer, audience (the client of the surface
 * being signed in to), expiry, and that the email was verified by Buffr ID. The token proves who the person is; what they may do in
 * Checkpoint is decided here, from Checkpoint's own roles.
 */
@Injectable()
export class BuffrIdService {
  private readonly logger = new Logger(BuffrIdService.name);
  private jwks: { url: string; keys: ReturnType<typeof createRemoteJWKSet> } | null = null;

  isEnabled(): boolean {
    return buffrIdConfig() !== null;
  }

  publicConfig() {
    const config = buffrIdConfig();
    const legacy = legacyPasswordMode();
    return config
      ? { enabled: true as const, issuer: config.issuer, legacyPassword: legacy }
      : { enabled: false as const, legacyPassword: legacy };
  }

  async verifyIdToken(idToken: string, surface: SignInSurface, expectedNonce?: string): Promise<BuffrIdIdentity> {
    const config = buffrIdConfig();
    if (!config) throw new ServiceUnavailableException("Buffr ID sign-in is not configured");
    const url = `${config.issuer}/api/auth/jwks`;
    if (this.jwks?.url !== url)
      this.jwks = { url, keys: createRemoteJWKSet(new URL(url), { cooldownDuration: 30_000 }) };

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(idToken, this.jwks.keys, {
        issuer: config.issuer,
        audience: config.clientIds[surface],
        algorithms: ["EdDSA"],
        clockTolerance: 5,
      }));
    } catch (error) {
      this.logger.warn(`Buffr ID token refused: ${error instanceof Error ? error.name : "error"}`);
      throw new UnauthorizedException("Invalid Buffr ID sign-in");
    }
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!payload.sub || !email || payload.email_verified !== true) {
      throw new UnauthorizedException("Buffr ID did not confirm this email address");
    }
    // The nonce binds the token to the browser that started the sign-in, so a token replayed from elsewhere is refused.
    if (expectedNonce !== undefined && payload.nonce !== expectedNonce) {
      throw new UnauthorizedException("Invalid Buffr ID sign-in");
    }
    return { subject: payload.sub, email, twoFactorEnabled: payload.two_factor_enabled === true };
  }
}
