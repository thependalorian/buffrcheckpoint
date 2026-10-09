import { Inject, Injectable } from "@nestjs/common";
import { desc, eq, isNull } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import { authSigningKey, authSigningKeyStatusLog } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

export type SigningKeyStatus = "active" | "retiring" | "retired";

export interface StoredSigningKey {
  id: string;
  kid: string;
  status: SigningKeyStatus;
  publicJwk: Record<string, unknown>;
  privateKeyEnvelope: string;
  verifyUntil: Date | null;
  createdAt: Date;
}

export interface NewSigningKey {
  kid: string;
  publicJwk: Record<string, unknown>;
  privateKeyEnvelope: string;
}

/** Where signing keys live. The database implementation is below; tests use an in-memory one. */
export interface SigningKeyStore {
  /** Keys that are not retired, newest first. */
  listLive(): Promise<StoredSigningKey[]>;
  insertActive(key: NewSigningKey, reasonCode: string): Promise<void>;
  setStatus(id: string, to: SigningKeyStatus, reasonCode: string, verifyUntil?: Date | null): Promise<void>;
}

/** Signing keys in `auth_signing_key`, with every status change appended to `auth_signing_key_status_log`. */
@Injectable()
export class DrizzleSigningKeyStore implements SigningKeyStore {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async listLive(): Promise<StoredSigningKey[]> {
    const rows = await this.db
      .select()
      .from(authSigningKey)
      .where(isNull(authSigningKey.deletedAt))
      .orderBy(desc(authSigningKey.createdAt));
    const live: StoredSigningKey[] = [];
    for (const row of rows) {
      const status = (await this.typeDefs.codeById(row.statusCode)) as SigningKeyStatus | null;
      if (status === "active" || status === "retiring") {
        live.push({
          id: row.id,
          kid: row.kid,
          status,
          publicJwk: row.publicJwk as Record<string, unknown>,
          privateKeyEnvelope: row.privateKeyEnvelope,
          verifyUntil: row.verifyUntil,
          createdAt: row.createdAt,
        });
      }
    }
    return live;
  }

  async insertActive(key: NewSigningKey, reasonCode: string): Promise<void> {
    const id = randomUUID();
    const active = await this.typeDefs.id("signing_key_status", "active");
    await this.db.insert(authSigningKey).values({
      id,
      kid: key.kid,
      algorithmCode: await this.typeDefs.id("signing_key_algorithm", "EdDSA"),
      statusCode: active,
      publicJwk: key.publicJwk,
      privateKeyEnvelope: key.privateKeyEnvelope,
    });
    await this.db
      .insert(authSigningKeyStatusLog)
      .values({ id: randomUUID(), signingKeyId: id, fromStatusCode: null, toStatusCode: active, reasonCode });
  }

  async setStatus(id: string, to: SigningKeyStatus, reasonCode: string, verifyUntil?: Date | null): Promise<void> {
    const row = await this.db.query.authSigningKey.findFirst({ where: eq(authSigningKey.id, id) });
    if (!row) return;
    const toId = await this.typeDefs.id("signing_key_status", to);
    await this.db
      .update(authSigningKey)
      .set({ statusCode: toId, ...(verifyUntil === undefined ? {} : { verifyUntil }) })
      .where(eq(authSigningKey.id, id));
    await this.db.insert(authSigningKeyStatusLog).values({
      id: randomUUID(),
      signingKeyId: id,
      fromStatusCode: row.statusCode,
      toStatusCode: toId,
      reasonCode,
    });
  }
}
