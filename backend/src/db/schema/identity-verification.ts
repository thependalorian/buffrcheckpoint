import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { typeDefinition } from "./type-definitions";
import { visitorVisits } from "./visits";

// Renamed `identity_verification_event` -> `visitor_identity_assessments`.
// Stores only the verification outcome/reference, never the full credential
// payload. Append-only by construction — no separate status log needed.
export const visitorIdentityAssessments = pgTable(
  "visitor_identity_assessments",
  {
    id: uuid("id").primaryKey(),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visitorVisits.id),
    verificationProviderCode: uuid("verification_provider_code")
      .notNull()
      .references(() => typeDefinition.id),
    assuranceLevelCode: uuid("assurance_level_code")
      .notNull()
      .references(() => typeDefinition.id),
    outcomeReference: text("outcome_reference"),
    outcomeCode: text("outcome_code"),
    releasedAttributeCodes: jsonb("released_attribute_codes"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_visitor_identity_assessments_visit").on(t.visitId)],
);

export type VisitorIdentityAssessment = typeof visitorIdentityAssessments.$inferSelect;
