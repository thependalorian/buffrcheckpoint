import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// KYB (Know Your Business) — scoped to business-identity verification at
// onboarding, not ongoing sanctions/PEP/AML monitoring (that's a
// regulated-fintech-grade capability this visitor-management product
// doesn't need). Gates organisation_subscription reaching 'active'.
export const organisationKybVerification = pgTable(
  "organisation_kyb_verification",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    businessRegistrationNumber: text("business_registration_number").notNull(),
    registeredBusinessName: text("registered_business_name").notNull(),
    registeredAddressProtected: jsonb("registered_address_protected").notNull(),
    authorizedSignatoryNameProtected: jsonb("authorized_signatory_name_protected").notNull(),
    registrationDocumentReference: text("registration_document_reference"),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    verifiedBy: uuid("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_organisation_kyb_verification_org").on(t.organisationId)],
);

export const organisationKybStatusEvents = pgTable(
  "organisation_kyb_status_events",
  {
    id: uuid("id").primaryKey(),
    kybVerificationId: uuid("kyb_verification_id")
      .notNull()
      .references(() => organisationKybVerification.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    note: text("note"),
  },
  (t) => [index("idx_organisation_kyb_status_events_kyb").on(t.kybVerificationId, t.occurredAt)],
);

export type OrganisationKybVerification = typeof organisationKybVerification.$inferSelect;
export type NewOrganisationKybVerification = typeof organisationKybVerification.$inferInsert;
