import { Injectable } from "@nestjs/common";

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

const LOCAL_DEV_KEY_ENV_VAR = "LOCAL_DEV_DATA_KEY";
const KEY_VERSION = 1;

function localDevKey(): Buffer {
  const configured = process.env[LOCAL_DEV_KEY_ENV_VAR];
  // 32-byte key required by AES-256-GCM. Never fall back to a fixed value in
  // a real deployment — this is a local-dev stand-in for a KMS-issued data
  // key, documented as such in backend/.env.example.
  const material = configured ?? "local-dev-only-insecure-key-do-not-deploy!!";
  return createHash("sha256").update(material).digest();
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
    const cipher = createCipheriv("aes-256-gcm", localDevKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptionAlgorithm: "AES_256_GCM",
      keyManagementReference: "local-dev-stub",
      keyVersion: KEY_VERSION,
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
    const decipher = createDecipheriv(
      "aes-256-gcm",
      localDevKey(),
      Buffer.from(envelope.initializationVector, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.authenticationTag, "base64"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
    return plaintext.toString("utf8");
  }

  // The keyed HMAC lookup index (Canonical Engineering Constitution's
  // explicit correction: a plain hash of a name/phone is dictionary-attack
  // vulnerable — this is a lookup index, never treated as data protection
  // on its own). Callers name the result for its purpose, e.g.
  // `visitorNameLookupHmac`, never `nameHash`.
  lookupHmac(value: string, pepperEnvVar: string): string {
    const pepper = process.env[pepperEnvVar] ?? "";
    return createHash("sha256").update(`${pepper}:${value.trim().toLowerCase()}`).digest("hex");
  }
}
