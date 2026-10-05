import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { siteHosts } from "./hosts";
import { visitInvitations } from "./invitations";
import { kioskExperienceConfigurationVersions } from "./kiosk-experience";
import { managedKioskDevices } from "./managed-kiosk-devices";
import { organisations } from "./organisations";
import { siteBrandingProfileVersions } from "./site-branding";
import { securityZones, sites } from "./sites";
import { typeDefinition } from "./type-definitions";
import { visitorSubjects } from "./visitors";

// Renamed `visit` -> `visitor_visits` per the Canonical Engineering
// Constitution. `visitorTypeCode`/`captureChannelCode` renamed to
// `visitorCategoryCode`/`arrivalChannelCode` to match.
export const visitorVisits = pgTable(
  "visitor_visits",
  {
    id: uuid("id").primaryKey(), // client-generated, idempotent offline sync
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    zoneId: uuid("zone_id").references(() => securityZones.id),
    visitorId: uuid("visitor_id").references(() => visitorSubjects.id),
    hostId: uuid("host_id")
      .notNull()
      .references(() => siteHosts.id),
    visitorCategoryCode: uuid("visitor_category_code")
      .notNull()
      .references(() => typeDefinition.id),
    invitationId: uuid("invitation_id").references(() => visitInvitations.id),
    purposeCategoryCode: uuid("purpose_category_code").references(() => typeDefinition.id),
    arrivalChannelCode: uuid("arrival_channel_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id), // current status, denormalized from visit_status_events
    identityAssuranceLevelCode: uuid("identity_assurance_level_code").references(() => typeDefinition.id),
    accessDecisionCode: uuid("access_decision_code").references(() => typeDefinition.id),
    photoReference: text("photo_reference"), // disabled by default; enforced by access_policy.config
    notes: text("notes"), // restricted; same enforcement point
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull(),
    serverAcceptedAt: timestamp("server_accepted_at", { withTimezone: true }),
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
    offlineCaptured: boolean("offline_captured").notNull().default(false),
    retentionPolicyVersion: integer("retention_policy_version").notNull(),
    idempotencyKey: text("idempotency_key"),
    brandingProfileVersionId: uuid("branding_profile_version_id").references(() => siteBrandingProfileVersions.id),
    kioskExperienceConfigurationVersionId: uuid("kiosk_experience_configuration_version_id").references(
      () => kioskExperienceConfigurationVersions.id,
    ),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_visitor_visits_org_site").on(t.organisationId, t.siteId),
    index("idx_visitor_visits_org_visitor").on(t.organisationId, t.visitorId),
    uniqueIndex("idx_visitor_visits_org_idempotency_key").on(t.organisationId, t.idempotencyKey),
  ],
);

export const visitStatusEvents = pgTable(
  "visit_status_events",
  {
    id: uuid("id").primaryKey(),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visitorVisits.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    reasonCode: uuid("reason_code").references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    deviceId: uuid("device_id").references(() => managedKioskDevices.id),
  },
  (t) => [index("idx_visit_status_events_visit").on(t.visitId, t.occurredAt)],
);

export type VisitorVisit = typeof visitorVisits.$inferSelect;
export type NewVisitorVisit = typeof visitorVisits.$inferInsert;
export type VisitStatusEvent = typeof visitStatusEvents.$inferSelect;
