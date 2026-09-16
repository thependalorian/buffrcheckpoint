import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";

// Full Device Compliance Register field set per Addendum §2.2. "No
// unregistered device should be deployable" (§14.3a). Renamed `device` ->
// `managed_kiosk_devices` per the Canonical Engineering Constitution.
export const managedKioskDevices = pgTable(
  "managed_kiosk_devices",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    deviceName: text("device_name"),
    manufacturer: text("manufacturer").notNull(),
    model: text("model").notNull(),
    serialNumber: text("serial_number").notNull(),
    radioWifi: boolean("radio_wifi").notNull().default(false),
    radioBluetooth: boolean("radio_bluetooth").notNull().default(false),
    radioNfc: boolean("radio_nfc").notNull().default(false),
    radioCellular: boolean("radio_cellular").notNull().default(false),
    cranComplianceStatusCode: uuid("cran_compliance_status_code").references(() => typeDefinition.id),
    cranCertificateReference: text("cran_certificate_reference"),
    supplierEvidenceReference: text("supplier_evidence_reference"),
    firmwareVersion: text("firmware_version"),
    warrantyExpiresAt: timestamp("warranty_expires_at", { withTimezone: true }),
    mdmEnrolmentStatus: uuid("mdm_enrolment_status").references(() => typeDefinition.id),
    disposalEvidenceReference: text("disposal_evidence_reference"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_managed_kiosk_devices_org_site").on(t.organisationId, t.siteId),
    uniqueIndex("idx_managed_kiosk_devices_serial").on(t.organisationId, t.serialNumber),
  ],
);

export const deviceOperationalStatusLog = pgTable(
  "device_operational_status_log",
  {
    id: uuid("id").primaryKey(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => managedKioskDevices.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    reason: text("reason"),
  },
  (t) => [index("idx_device_operational_status_log_device").on(t.deviceId, t.occurredAt)],
);

export type ManagedKioskDevice = typeof managedKioskDevices.$inferSelect;
export type NewManagedKioskDevice = typeof managedKioskDevices.$inferInsert;
