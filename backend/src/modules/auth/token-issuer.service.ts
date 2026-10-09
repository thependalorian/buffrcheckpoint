import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  createLocalJWKSet,
  decodeProtectedHeader,
  exportJWK,
  exportPKCS8,
  generateKeyPair,
  importPKCS8,
  type JWK,
  type JWTPayload,
  jwtVerify,
  type KeyLike,
  SignJWT,
} from "jose";

import { decryptSecret, encryptSecret } from "../../common/crypto/secret-crypto";
import { DrizzleSigningKeyStore, type StoredSigningKey } from "./signing-key.store";
import { randomUUID } from "node:crypto";

/** Issuer claim on every token this API signs. A token from any other issuer is refused (SE-5). */
export const TOKEN_ISSUER = "buffrcheckpoint-api";
/** A signing key signs for 90 days, then verifies for a further 30 days so tokens already issued stay valid (SE-1). */
export const KEY_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;
export const KEY_OVERLAP_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_MS = 60_000;
const ROTATION_CHECK_MS = 6 * 60 * 60 * 1000;

interface LoadedKeys {
  loadedAt: number;
  keys: StoredSigningKey[];
}

/**
 * Signs and verifies access tokens with Ed25519 keys held in the database (SE-1).
 * The public keys are published at /.well-known/jwks.json. Rotation creates a new key every 90 days and keeps the old one verifying for
 * 30 more. Tokens signed with the former shared secret are accepted only while JWT_LEGACY_HS256_UNTIL is in the future, so the cutover
 * does not sign everyone out; leave it unset afterwards.
 */
@Injectable()
export class TokenIssuerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenIssuerService.name);
  private loaded: LoadedKeys | null = null;
  private timer: NodeJS.Timeout | null = null;

  /** Time source; tests replace it to move through the 90 and 30 day windows. */
  clock: () => number = Date.now;

  constructor(private readonly store: DrizzleSigningKeyStore) {}

  private now(): number {
    return this.clock();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.rotateIfDue();
    } catch (error) {
      this.logger.error(`Signing key check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    this.timer = setInterval(() => {
      this.rotateIfDue().catch((error: unknown) => this.logger.error(`Signing key rotation failed: ${String(error)}`));
    }, ROTATION_CHECK_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Creates the first key, or a new one once the active key is 90 days old, and retires keys whose overlap has ended. */
  async rotateIfDue(): Promise<"created" | "rotated" | "none"> {
    const now = new Date(this.now());
    const keys = await this.store.listLive();
    const active = keys.find((key) => key.status === "active");
    let outcome: "created" | "rotated" | "none" = "none";
    if (!active) {
      await this.store.insertActive(await this.generateKey(), "initial");
      outcome = "created";
    } else if (now.getTime() - active.createdAt.getTime() >= KEY_LIFETIME_MS) {
      await this.store.insertActive(await this.generateKey(), "rotation");
      await this.store.setStatus(active.id, "retiring", "rotation", new Date(now.getTime() + KEY_OVERLAP_MS));
      outcome = "rotated";
    }
    for (const key of keys) {
      if (key.status === "retiring" && key.verifyUntil && key.verifyUntil.getTime() <= now.getTime()) {
        await this.store.setStatus(key.id, "retired", "overlap_ended");
      }
    }
    this.loaded = null;
    return outcome;
  }

  /**
   * Signs a token with the active key.
   *
   * @param claims - Token claims. `aud` is part of the claims; `iss`, `iat` and `exp` are added here.
   * @param ttlSeconds - Lifetime in seconds.
   */
  async sign(claims: Record<string, unknown>, ttlSeconds: number): Promise<string> {
    const keys = await this.keys();
    const active = keys.find((key) => key.status === "active");
    if (!active) throw new Error("No active signing key");
    const privateKey = await importPKCS8(decryptSecret(active.privateKeyEnvelope), "EdDSA");
    const issuedAt = Math.floor(this.now() / 1000);
    return new SignJWT(claims as JWTPayload)
      .setProtectedHeader({ alg: "EdDSA", kid: active.kid })
      .setIssuer(TOKEN_ISSUER)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + ttlSeconds)
      .sign(privateKey);
  }

  /** Verifies a token and returns its claims. Throws on a bad signature, wrong issuer, wrong algorithm or expiry. */
  async verify(token: string): Promise<JWTPayload> {
    const header = decodeProtectedHeader(token);
    if (header.alg === "EdDSA") {
      const keys = await this.keys();
      const set = createLocalJWKSet({ keys: keys.map((key) => key.publicJwk as unknown as JWK) });
      const { payload } = await jwtVerify(token, set, {
        issuer: TOKEN_ISSUER,
        algorithms: ["EdDSA"],
        currentDate: new Date(this.now()),
      });
      return payload;
    }
    if (header.alg === "HS256" && this.legacyAccepted()) {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("Legacy token refused");
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ["HS256"],
        currentDate: new Date(this.now()),
      });
      return payload;
    }
    throw new Error("Token algorithm is not accepted");
  }

  /** The public key set for /.well-known/jwks.json: active and retiring keys only. */
  async publicKeySet(): Promise<{ keys: JWK[] }> {
    const keys = await this.keys();
    return { keys: keys.map((key) => key.publicJwk as unknown as JWK) };
  }

  private legacyAccepted(): boolean {
    const until = Date.parse(process.env.JWT_LEGACY_HS256_UNTIL ?? "");
    return Number.isFinite(until) && until > this.now();
  }

  private async keys(): Promise<StoredSigningKey[]> {
    if (this.loaded && this.now() - this.loaded.loadedAt < CACHE_MS) return this.loaded.keys;
    const now = this.now();
    const keys = (await this.store.listLive()).filter(
      (key) => key.status === "active" || (key.verifyUntil && key.verifyUntil.getTime() > now),
    );
    this.loaded = { loadedAt: now, keys };
    return keys;
  }

  private async generateKey() {
    const { publicKey, privateKey } = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
    const kid = randomUUID();
    const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: "EdDSA", use: "sig" };
    return { kid, publicJwk, privateKeyEnvelope: encryptSecret(await exportPKCS8(privateKey as KeyLike)) };
  }
}
