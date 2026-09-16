import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { sites } from "./sites";
import { visitorVisits } from "./visits";

export const telecommunicationsProviderArrangements = pgTable("telecommunications_provider_arrangements", {
  id: uuid("id").primaryKey(),
  providerCode: text("provider_code").notNull().unique(),
  displayName: text("display_name").notNull(),
  webhookSecretRef: text("webhook_secret_ref"),
  allowedSourceIps: text("allowed_source_ips").array(),
  mtlsRequired: boolean("mtls_required").notNull().default(false),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const featurePhoneCheckInSessions = pgTable(
  "feature_phone_check_in_sessions",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id").references(() => sites.id),
    providerCode: text("provider_code").notNull(),
    carrierSessionReference: text("carrier_session_reference").notNull(),
    providerRequestId: text("provider_request_id"),
    statusCode: text("status_code").notNull().default("open"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    visitId: uuid("visit_id").references(() => visitorVisits.id),
  },
  (t) => [
    index("idx_feature_phone_sessions_provider_ref").on(t.providerCode, t.carrierSessionReference),
  ],
);
