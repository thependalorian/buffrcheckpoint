import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { siteHosts } from "./hosts";
import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";

// Release 1.5 pre-registration. Matched to a visit at check-in via
// invitationCode — never a public name search.
export const visitInvitations = pgTable(
  "visit_invitations",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    hostId: uuid("host_id")
      .notNull()
      .references(() => siteHosts.id),
    visitorCategoryCode: uuid("visitor_category_code").references(() => typeDefinition.id),
    visitorReference: text("visitor_reference").notNull(),
    invitationCode: text("invitation_code").notNull(),
    tokenHmac: text("token_hmac"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow(),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    maximumRedemptions: integer("maximum_redemptions").notNull().default(1),
    redeemedCount: integer("redeemed_count").notNull().default(0),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expectedFrom: timestamp("expected_from", { withTimezone: true }),
    expectedUntil: timestamp("expected_until", { withTimezone: true }),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    verificationRequirementCode: uuid("verification_requirement_code").references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_visit_invitations_org_site").on(t.organisationId, t.siteId),
    uniqueIndex("idx_visit_invitations_code").on(t.organisationId, t.invitationCode),
    uniqueIndex("idx_visit_invitations_token_hmac").on(t.organisationId, t.tokenHmac),
  ],
);

export const visitInvitationStatusEvents = pgTable(
  "visit_invitation_status_events",
  {
    id: uuid("id").primaryKey(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => visitInvitations.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    reason: text("reason"),
  },
  (t) => [index("idx_visit_invitation_status_events_invitation").on(t.invitationId, t.occurredAt)],
);

export type VisitInvitation = typeof visitInvitations.$inferSelect;
export type NewVisitInvitation = typeof visitInvitations.$inferInsert;
