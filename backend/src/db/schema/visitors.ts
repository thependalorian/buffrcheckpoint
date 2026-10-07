import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// Renamed `visitor` -> a stable, PII-free subject reference plus a
// separated protected-payload table, per the Canonical Engineering
// Constitution's §5.2 visitor-identity model.
export const visitorSubjects = pgTable(
  "visitor_subjects",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    subjectStatusCode: uuid("subject_status_code").references(() => typeDefinition.id),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    mergedIntoVisitorId: uuid("merged_into_visitor_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_visitor_subjects_org").on(t.organisationId)],
);

export const visitorPersonalData = pgTable("visitor_personal_data", {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  visitorId: uuid("visitor_id")
    .primaryKey()
    .references(() => visitorSubjects.id),
  encryptedPayload: jsonb("encrypted_payload").notNull(), // ProtectedPersonalDataEnvelope: name/phone/etc
  nameLookupHmac: text("name_lookup_hmac"),
  phoneLookupHmac: text("phone_lookup_hmac"),
  preferredLanguageCode: uuid("preferred_language_code").references(() => typeDefinition.id),
  lastRotatedAt: timestamp("last_rotated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VisitorSubject = typeof visitorSubjects.$inferSelect;
export type NewVisitorSubject = typeof visitorSubjects.$inferInsert;
export type VisitorPersonalData = typeof visitorPersonalData.$inferSelect;
