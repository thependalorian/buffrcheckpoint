import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { managedKioskDevices } from "./managed-kiosk-devices";
import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";

/**
 * Section 11.9.8.2 / 11.9.8.3 / 11.9.8.5 — per-site kiosk UX configuration
 * (idle timeout, maintenance mode, channel enablement) with version evidence.
 */
export const kioskExperienceConfigurations = pgTable(
  "kiosk_experience_configurations",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    deviceId: uuid("device_id").references(() => managedKioskDevices.id),
    configName: text("config_name"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_kiosk_experience_configurations_org_site").on(t.organisationId, t.siteId)],
);

export const kioskExperienceConfigurationVersions = pgTable(
  "kiosk_experience_configuration_versions",
  {
    id: uuid("id").primaryKey(),
    kioskExperienceConfigurationId: uuid("kiosk_experience_configuration_id")
      .notNull()
      .references(() => kioskExperienceConfigurations.id),
    versionNumber: integer("version_number").notNull(),
    idleTimeoutSeconds: integer("idle_timeout_seconds").notNull().default(120),
    idleWarningSeconds: integer("idle_warning_seconds").notNull().default(30),
    maintenanceModeEnabled: boolean("maintenance_mode_enabled").notNull().default(false),
    maintenanceMessage: text("maintenance_message"),
    assistedEntryDirection: text("assisted_entry_direction"),
    accessibilityLargeTextEnabled: boolean("accessibility_large_text_enabled").notNull().default(false),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    statusCode: uuid("status_code").references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_kiosk_experience_configuration_versions_config").on(t.kioskExperienceConfigurationId),
    uniqueIndex("idx_kiosk_experience_configuration_versions_config_version").on(
      t.kioskExperienceConfigurationId,
      t.versionNumber,
    ),
  ],
);

export const kioskExperienceConfigurationVersionChannels = pgTable(
  "kiosk_experience_configuration_version_channels",
  {
    id: uuid("id").primaryKey(),
    kioskExperienceConfigurationVersionId: uuid("kiosk_experience_configuration_version_id")
      .notNull()
      .references(() => kioskExperienceConfigurationVersions.id),
    captureChannelCode: uuid("capture_channel_code")
      .notNull()
      .references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_kiosk_experience_configuration_version_channels_version").on(t.kioskExperienceConfigurationVersionId),
    uniqueIndex("idx_kiosk_experience_configuration_version_channels_unique").on(
      t.kioskExperienceConfigurationVersionId,
      t.captureChannelCode,
    ),
  ],
);

export type KioskExperienceConfiguration = typeof kioskExperienceConfigurations.$inferSelect;
export type KioskExperienceConfigurationVersion = typeof kioskExperienceConfigurationVersions.$inferSelect;
