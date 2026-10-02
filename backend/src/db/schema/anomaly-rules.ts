import { boolean, index, integer, jsonb, pgTable, text, time, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";
import { visitorVisits } from "./visits";

// Live anomaly rules (db/migrations/0045_anomaly_rules.sql). No row for a
// site and rule means the code defaults apply. Alert events are append-only
// and hold references only.

export const siteAnomalyRuleConfigurations = pgTable("site_anomaly_rule_configurations", {
  id: uuid("id").primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id),
  siteId: uuid("site_id")
    .notNull()
    .references(() => sites.id),
  ruleCode: uuid("rule_code")
    .notNull()
    .references(() => typeDefinition.id),
  thresholdInt: integer("threshold_int").notNull(),
  windowMinutes: integer("window_minutes"),
  windowStartLocal: time("window_start_local"),
  windowEndLocal: time("window_end_local"),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const anomalyAlertEvents = pgTable(
  "anomaly_alert_events",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    ruleCode: uuid("rule_code")
      .notNull()
      .references(() => typeDefinition.id),
    visitId: uuid("visit_id").references(() => visitorVisits.id),
    subjectReference: text("subject_reference"),
    payloadJsonb: jsonb("payload_jsonb").$type<Record<string, string | number | null>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_anomaly_alert_events_org_site_occurred").on(t.organisationId, t.siteId, t.occurredAt)],
);
