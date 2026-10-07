import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { siteHosts } from "./hosts";
import { visitInvitations } from "./invitations";
import { organisations } from "./organisations";
import { securityZones, sites } from "./sites";
import { typeDefinition } from "./type-definitions";
import { visitorVisits } from "./visits";

/** Org+site PMS connection (CiMSO INNterchange first; provider_code from type_definition). */
export const pmsIntegrationConnections = pgTable(
  "pms_integration_connections",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    providerCode: uuid("provider_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    siteExternalId: text("site_external_id"),
    enabledInterfaceTypes: integer("enabled_interface_types").array().notNull().default([]),
    tcpHost: text("tcp_host"),
    tcpPort: integer("tcp_port"),
    tlsEnabled: boolean("tls_enabled").notNull().default(true),
    clientLoginId: text("client_login_id"),
    credentialsSecretRef: text("credentials_secret_ref"),
    serverSerialNumber: text("server_serial_number"),
    defaultHostId: uuid("default_host_id").references(() => siteHosts.id),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_pms_connections_org_active").on(t.organisationId)],
);

export const pmsIntegrationConnectionStatusLog = pgTable(
  "pms_integration_connection_status_log",
  {
    id: uuid("id").primaryKey(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => pmsIntegrationConnections.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    reason: text("reason"),
  },
  (t) => [index("idx_pms_connection_status_log").on(t.connectionId, t.occurredAt)],
);

export const pmsRoomZoneMappings = pgTable(
  "pms_room_zone_mappings",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => pmsIntegrationConnections.id),
    roomCode: text("room_code").notNull(),
    securityZoneId: uuid("security_zone_id")
      .notNull()
      .references(() => securityZones.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_pms_room_zone_org_site").on(t.organisationId, t.siteId)],
);

/** Immutable sync attempts — corrections are new rows, never UPDATE. */
export const pmsSyncRunLog = pgTable(
  "pms_sync_run_log",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => pmsIntegrationConnections.id),
    directionCode: text("direction_code").notNull(),
    outcomeCode: uuid("outcome_code")
      .notNull()
      .references(() => typeDefinition.id),
    recordsSeen: integer("records_seen").notNull().default(0),
    recordsApplied: integer("records_applied").notNull().default(0),
    errorCode: text("error_code"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    detailJson: jsonb("detail_json"),
  },
  (t) => [
    index("idx_pms_sync_run_org_site").on(t.organisationId, t.siteId, t.startedAt),
    index("idx_pms_sync_run_connection").on(t.connectionId, t.startedAt),
  ],
);

export const pmsExternalEntityLinks = pgTable(
  "pms_external_entity_links",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => pmsIntegrationConnections.id),
    entityKindCode: uuid("entity_kind_code")
      .notNull()
      .references(() => typeDefinition.id),
    externalEntityId: text("external_entity_id").notNull(),
    invitationId: uuid("invitation_id").references(() => visitInvitations.id),
    visitId: uuid("visit_id").references(() => visitorVisits.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_pms_external_entity_org_site").on(t.organisationId, t.siteId)],
);

export type PmsIntegrationConnection = typeof pmsIntegrationConnections.$inferSelect;
export type PmsRoomZoneMapping = typeof pmsRoomZoneMappings.$inferSelect;
export type PmsSyncRunLog = typeof pmsSyncRunLog.$inferSelect;
export type PmsExternalEntityLink = typeof pmsExternalEntityLinks.$inferSelect;
