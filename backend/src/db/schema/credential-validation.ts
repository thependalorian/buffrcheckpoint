import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { accessCredentials } from "./credentials";
import { managedKioskDevices } from "./managed-kiosk-devices";
import { organisations } from "./organisations";
import { sites } from "./sites";

export const readerSessions = pgTable(
  "reader_sessions",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => managedKioskDevices.id),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    trusted: boolean("trusted").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_reader_sessions_org_device").on(t.organisationId, t.deviceId)],
);

export const credentialUseEvents = pgTable(
  "credential_use_events",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    credentialId: uuid("credential_id")
      .notNull()
      .references(() => accessCredentials.id),
    deviceId: uuid("device_id").references(() => managedKioskDevices.id),
    readerSessionId: uuid("reader_session_id").references(() => readerSessions.id),
    siteId: uuid("site_id").references(() => sites.id),
    zoneId: uuid("zone_id"),
    outcomeCode: text("outcome_code").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_credential_use_events_credential").on(t.credentialId, t.occurredAt)],
);

export const credentialSiteEntitlements = pgTable(
  "credential_site_entitlements",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    credentialId: uuid("credential_id")
      .notNull()
      .references(() => accessCredentials.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    zoneId: uuid("zone_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_credential_site_entitlements_cred").on(t.credentialId)],
);
