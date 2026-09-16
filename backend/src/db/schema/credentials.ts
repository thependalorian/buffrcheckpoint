import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// Renamed `credential` -> `access_credentials`, `tokenReference` ->
// `credentialReferenceHmac` — a random reference (Section 12.2), stored as
// a keyed lookup HMAC, never a static NFC UID alone.
export const accessCredentials = pgTable(
  "access_credentials",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    holderTypeCode: uuid("holder_type_code")
      .notNull()
      .references(() => typeDefinition.id), // 'visitor' | 'contractor' | 'staff'
    holderId: uuid("holder_id"),
    credentialTypeCode: uuid("credential_type_code")
      .notNull()
      .references(() => typeDefinition.id),
    credentialReferenceHmac: text("credential_reference_hmac").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_access_credentials_org").on(t.organisationId)],
);

export const credentialStatusEvents = pgTable(
  "credential_status_events",
  {
    id: uuid("id").primaryKey(),
    credentialId: uuid("credential_id")
      .notNull()
      .references(() => accessCredentials.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    reason: text("reason"),
  },
  (t) => [index("idx_credential_status_events_credential").on(t.credentialId, t.occurredAt)],
);

export type AccessCredential = typeof accessCredentials.$inferSelect;
export type NewAccessCredential = typeof accessCredentials.$inferInsert;
