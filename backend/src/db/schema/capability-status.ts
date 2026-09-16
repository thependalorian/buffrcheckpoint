import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// Renamed `platform_capability_status` -> `platform_capability_approvals`
// per the Canonical Engineering Constitution §4.4/§9. Still the single
// platform-wide row per capability (no organisation_id — a deliberate
// tenancy exception, unchanged): platform-capable != client-approved.
export const platformCapabilityApprovals = pgTable(
  "platform_capability_approvals",
  {
    id: uuid("id").primaryKey(),
    capabilityCode: uuid("capability_code")
      .notNull()
      .references(() => typeDefinition.id), // domain 'capability_code'
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id), // domain 'capability_status_value'
    evidenceReference: text("evidence_reference"),
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    // Dual-approval fix (buffrcheckpoint.md §7901 promised this; only one
    // approver column existed). 'live' transitions require both
    // approvedBy and secondaryApprovedBy set, and distinct users.
    secondaryApprovedBy: uuid("secondary_approved_by"),
    secondaryApprovedAt: timestamp("secondary_approved_at", { withTimezone: true }),
    publicDisplayStatus: uuid("public_display_status")
      .notNull()
      .references(() => typeDefinition.id), // domain 'public_capability_status_value'
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("idx_platform_capability_approvals_code").on(t.capabilityCode)],
);

// Per tenant: has THIS organisation actually enabled a capability that is
// platform-approved. Unchanged by the rename (already matched the naming
// convention).
export const organisationCapabilityEnablement = pgTable(
  "organisation_capability_enablement",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    capabilityCode: uuid("capability_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    enabledAt: timestamp("enabled_at", { withTimezone: true }),
    enabledBy: uuid("enabled_by"),
    configurationReference: text("configuration_reference"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("idx_org_capability_enablement_org_capability").on(t.organisationId, t.capabilityCode)],
);

export type PlatformCapabilityApproval = typeof platformCapabilityApprovals.$inferSelect;
export type OrganisationCapabilityEnablement = typeof organisationCapabilityEnablement.$inferSelect;
