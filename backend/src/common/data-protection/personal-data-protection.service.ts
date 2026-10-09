import { Injectable } from "@nestjs/common";

import { requiredSecret } from "../crypto/required-secret";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Canonical Engineering Constitution §4/§5.2: the protected-PII envelope
// shape every *_protected / encrypted_payload jsonb column holds. Real KMS
// integration is deferred (per this pass's explicit scope decision) — this
// service is the ONE place that decision lives. Swapping in a real KMS
// later means changing `encrypt`/`decrypt` below to call that provider
// instead of the local AES-256-GCM implementation; every caller and every
// schema column stays exactly the same.
export interface ProtectedPersonalDataEnvelope {
  encryptionAlgorithm: "AES_256_GCM" | "LOCAL_DEV_STUB";
  keyManagementReference: string;
  keyVersion: number;
  encryptedDataKey?: string;
  initializationVector?: string;
  ciphertext: string;
  authenticationTag?: string;
}

// Key ring (EN-4 until a managed key service is chosen). Version 2 is PERSONAL_DATA_KEY, a random secret held only in the platform
// secret store; every new envelope uses it. Version 1 is the development key that ships in the source (LOCAL_DEV_DATA_KEY). It is
// public, so it only decrypts envelopes written before the rotation and `rotateEnvelope` moves them to version 2. Outside production
// with no PERSONAL_DATA_KEY the development key is still used so local runs and tests need no setup.
const LEGACY_KEY_ENV_VAR = "LOCAL_DEV_DATA_KEY";
const CURRENT_KEY_ENV_VAR = "PERSONAL_DATA_KEY";
const LEGACY_KEY_VERSION = 1;
const CURRENT_KEY_VERSION = 2;
const DEV_FALLBACK = "local-dev-only-insecure-key-do-not-deploy!!";

function deriveKey(material: string): Buffer {
  return createHash("sha256").update(material).digest();
}

/** The key and version used for new envelopes. */
function writeKey(): { key: Buffer; version: number } {
  const current = process.env[CURRENT_KEY_ENV_VAR];
  if (current) return { key: deriveKey(requiredSecret(CURRENT_KEY_ENV_VAR, "")), version: CURRENT_KEY_VERSION };
  return { key: deriveKey(requiredSecret(LEGACY_KEY_ENV_VAR, DEV_FALLBACK)), version: LEGACY_KEY_VERSION };
}

/** The key that decrypts an envelope of the given version. */
function readKey(version: number): Buffer {
  if (version === CURRENT_KEY_VERSION) return deriveKey(requiredSecret(CURRENT_KEY_ENV_VAR, ""));
  return deriveKey(requiredSecret(LEGACY_KEY_ENV_VAR, DEV_FALLBACK));
}

@Injectable()
export class PersonalDataProtectionService {
  // Encrypts a plaintext PII value into the envelope shape stored in
  // *_protected / encrypted_payload columns. Uses a real AES-256-GCM cipher
  // (not a placeholder plaintext-passthrough like this codebase's prior
  // phoneEncrypted/nameEncrypted pattern) — the KMS behind the data key is
  // the local-dev stub, not the cipher itself.
  encrypt(plaintext: string): ProtectedPersonalDataEnvelope {
    const iv = randomBytes(12);
    const { key, version } = writeKey();
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptionAlgorithm: "AES_256_GCM",
      keyManagementReference: version === CURRENT_KEY_VERSION ? "platform-secret-store" : "local-dev-stub",
      keyVersion: version,
      initializationVector: iv.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
      authenticationTag: authTag.toString("base64"),
    };
  }

  decrypt(envelope: ProtectedPersonalDataEnvelope): string {
    if (envelope.encryptionAlgorithm === "LOCAL_DEV_STUB") {
      // Migration-era rows (Section 11.4.5a's original placeholder pattern,
      // carried forward by migration 0008) — the "ciphertext" field is just
      // base64 of the original plaintext, no real decryption to perform.
      return Buffer.from(envelope.ciphertext, "base64").toString("utf8");
    }
    if (!envelope.initializationVector || !envelope.authenticationTag) {
      throw new Error("Malformed protected-data envelope: missing IV or auth tag");
    }
    const tag = Buffer.from(envelope.authenticationTag, "base64");
    if (tag.length !== 16) throw new Error("Malformed protected-data envelope: wrong auth tag length");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      readKey(envelope.keyVersion),
      Buffer.from(envelope.initializationVector, "base64"),
      { authTagLength: 16 },
    );
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
    return plaintext.toString("utf8");
  }

  /** True when the envelope is a real cipher text written under an older key than the current one. */
  needsRotation(envelope: ProtectedPersonalDataEnvelope): boolean {
    return envelope.encryptionAlgorithm === "AES_256_GCM" && envelope.keyVersion < writeKey().version;
  }

  /** Re-encrypts an envelope under the current key. Idempotent: an envelope already on the current key is returned unchanged. */
  rotateEnvelope(envelope: ProtectedPersonalDataEnvelope): ProtectedPersonalDataEnvelope {
    return this.needsRotation(envelope) ? this.encrypt(this.decrypt(envelope)) : envelope;
  }

  /**
   * Normalize phone strings for HMAC lookup so "+264 81 111 9029",
   * "+264811119029", and "264811119029" resolve to the same digest.
   * Digits only; preserve a leading "+" when the input had one (or looks
   * like an international number with country code length ≥ 10).
   */
  normalizePhoneForLookup(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const digits = trimmed.replace(/\D/g, "");
    if (!digits) return trimmed.toLowerCase();
    const hadPlus = trimmed.startsWith("+");
    // Prefer E.164-style (+digits) when the caller used +, otherwise digits-only.
    return hadPlus ? `+${digits}` : digits;
  }

  // The keyed HMAC lookup index (Canonical Engineering Constitution's
  // explicit correction: a plain hash of a name/phone is dictionary-attack
  // vulnerable — this is a lookup index, never treated as data protection
  // on its own). Callers name the result for its purpose, e.g.
  // `visitorNameLookupHmac`, never `nameHash`.
  lookupHmac(value: string, pepperEnvVar: string): string {
    const pepper = requiredSecret(pepperEnvVar, "");
    const material =
      pepperEnvVar === "PHONE_HASH_PEPPER" ? this.normalizePhoneForLookup(value) : value.trim().toLowerCase();
    return createHash("sha256").update(`${pepper}:${material}`).digest("hex");
  }

  /**
   * Digests to try when matching a phone against rows written before
   * normalization (legacy trim+lower) and alternate +/digits forms.
   */
  phoneLookupHmacCandidates(value: string): string[] {
    const pepper = requiredSecret("PHONE_HASH_PEPPER", "");
    const digits = value.replace(/\D/g, "");
    const variants = new Set<string>();
    variants.add(this.normalizePhoneForLookup(value));
    variants.add(value.trim().toLowerCase());
    if (digits) {
      variants.add(digits);
      variants.add(`+${digits}`);
    }
    return [...variants]
      .filter((v) => v.length > 0)
      .map((material) => createHash("sha256").update(`${pepper}:${material}`).digest("hex"));
  }
}
