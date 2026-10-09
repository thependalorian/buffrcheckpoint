import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { applicationUsers } from "./rbac";
import { typeDefinition } from "./type-definitions";

// Signing keys are platform-wide (one key set for the whole API), so there is no tenant column, like platform_capability_approvals.
export const authSigningKey = pgTable(
  "auth_signing_key",
  {
    id: uuid("id").primaryKey(),
    kid: text("kid").notNull(),
    algorithmCode: uuid("algorithm_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    publicJwk: jsonb("public_jwk").notNull(),
    /** AES-256-GCM envelope of the PKCS8 private key. Never returned or logged. */
    privateKeyEnvelope: text("private_key_envelope").notNull(),
    verifyUntil: timestamp("verify_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("uq_auth_signing_key_kid").on(t.kid).where(sql`${t.deletedAt} is null`),
    index("idx_auth_signing_key_status").on(t.statusCode, t.createdAt).where(sql`${t.deletedAt} is null`),
  ],
);

export const authSigningKeyStatusLog = pgTable(
  "auth_signing_key_status_log",
  {
    id: uuid("id").primaryKey(),
    signingKeyId: uuid("signing_key_id")
      .notNull()
      .references(() => authSigningKey.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    reasonCode: text("reason_code").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_auth_signing_key_status_log_key").on(t.signingKeyId, t.occurredAt)],
);

export const authRefreshToken = pgTable(
  "auth_refresh_token",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => applicationUsers.id),
    familyId: uuid("family_id").notNull(),
    /** SHA-256 of 32 random bytes. The raw token is never stored. */
    tokenHash: text("token_hash").notNull(),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    replacedById: uuid("replaced_by_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("uq_auth_refresh_token_hash").on(t.organisationId, t.tokenHash).where(sql`${t.deletedAt} is null`),
    index("idx_auth_refresh_token_family").on(t.organisationId, t.familyId).where(sql`${t.deletedAt} is null`),
    index("idx_auth_refresh_token_user").on(t.organisationId, t.userId).where(sql`${t.deletedAt} is null`),
  ],
);

export const authRefreshTokenStatusLog = pgTable(
  "auth_refresh_token_status_log",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    refreshTokenId: uuid("refresh_token_id")
      .notNull()
      .references(() => authRefreshToken.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    reasonCode: text("reason_code").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_auth_refresh_token_status_log_token").on(t.organisationId, t.refreshTokenId, t.occurredAt)],
);
