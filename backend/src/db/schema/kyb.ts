import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// KYB (Know Your Business) — scoped to business-identity verification at
// onboarding, not ongoing sanctions/PEP/AML monitoring (that's a
// regulated-fintech-grade capability this visitor-management product
// doesn't need). Gates organisation_subscription reaching 'active'.
export const organisationKybVerification = pgTable(
  "organisation_kyb_verification",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    businessRegistrationNumber: text("business_registration_number").notNull(),
    registeredBusinessName: text("registered_business_name").notNull(),
    registeredAddressProtected: jsonb("registered_address_protected").notNull(),
    authorizedSignatoryNameProtected: jsonb("authorized_signatory_name_protected").notNull(),
    registrationDocumentReference: text("registration_document_reference"),
    entityTypeCode: uuid("entity_type_code").references(() => typeDefinition.id),
    principalBusiness: text("principal_business"),
    financialYearEnd: text("financial_year_end"),
    membersProtected: jsonb("members_protected"),
    fieldSources: jsonb("field_sources"),
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
    flaggedFields: jsonb("flagged_fields"),
  },
  (t) => [index("idx_organisation_kyb_status_events_kyb").on(t.kybVerificationId, t.occurredAt)],
);

export const organisationKybDocument = pgTable(
  "organisation_kyb_document",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    documentTypeCode: uuid("document_type_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    fileReference: text("file_reference").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    contentSha256: text("content_sha256").notNull(),
    extractionMethod: text("extraction_method"),
    extractionProtected: jsonb("extraction_protected"),
    uploadedBy: uuid("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_organisation_kyb_document_org").on(t.organisationId, t.createdAt)],
);

export const organisationKybDocumentStatusEvents = pgTable(
  "organisation_kyb_document_status_events",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => organisationKybDocument.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    note: text("note"),
  },
  (t) => [index("idx_organisation_kyb_document_status_events_doc").on(t.organisationId, t.documentId, t.occurredAt)],
);

export type OrganisationKybDocument = typeof organisationKybDocument.$inferSelect;

export type OrganisationKybVerification = typeof organisationKybVerification.$inferSelect;
export type NewOrganisationKybVerification = typeof organisationKybVerification.$inferInsert;
