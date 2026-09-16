import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { managedKioskDevices } from "./managed-kiosk-devices";
import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";
import { visitorVisits } from "./visits";

// Renamed `consent_agreement` -> split into `visitor_policy_documents` +
// `visitor_policy_versions` (the old table conflated a document with its
// one active version); `consent_acknowledgement` ->
// `visitor_policy_acknowledgements`.
export const visitorPolicyDocuments = pgTable(
  "visitor_policy_documents",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    policyCode: text("policy_code").notNull(),
    policyName: text("policy_name"),
    category: text("category"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_visitor_policy_documents_org").on(t.organisationId)],
);

export const visitorPolicyVersions = pgTable(
  "visitor_policy_versions",
  {
    id: uuid("id").primaryKey(),
    policyDocumentId: uuid("policy_document_id")
      .notNull()
      .references(() => visitorPolicyDocuments.id),
    versionNumber: integer("version_number").notNull(),
    contentArtifactId: text("content_artifact_id"),
    contentHash: text("content_hash").notNull(),
    languageCode: uuid("language_code")
      .notNull()
      .references(() => typeDefinition.id),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    statusCode: uuid("status_code").references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_visitor_policy_versions_document").on(t.policyDocumentId)],
);

// Append-only by construction (an acknowledgement is never edited). New
// `legal_basis_code` distinguishes a mandatory security notice from
// genuinely revocable optional consent.
export const visitorPolicyAcknowledgements = pgTable(
  "visitor_policy_acknowledgements",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visitorVisits.id),
    policyVersionId: uuid("policy_version_id")
      .notNull()
      .references(() => visitorPolicyVersions.id),
    legalBasisCode: uuid("legal_basis_code")
      .notNull()
      .references(() => typeDefinition.id),
    languageShownCode: uuid("language_shown_code")
      .notNull()
      .references(() => typeDefinition.id),
    displayedAt: timestamp("displayed_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acknowledgementMethodCode: uuid("acknowledgement_method_code")
      .notNull()
      .references(() => typeDefinition.id),
    signatureArtifactId: text("signature_artifact_id"),
    deviceId: uuid("device_id").references(() => managedKioskDevices.id),
    siteId: uuid("site_id").references(() => sites.id),
    captureChannelCode: uuid("capture_channel_code").references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_visitor_policy_acknowledgements_org_visit").on(t.organisationId, t.visitId)],
);

export type VisitorPolicyDocument = typeof visitorPolicyDocuments.$inferSelect;
export type VisitorPolicyVersion = typeof visitorPolicyVersions.$inferSelect;
export type VisitorPolicyAcknowledgement = typeof visitorPolicyAcknowledgements.$inferSelect;
