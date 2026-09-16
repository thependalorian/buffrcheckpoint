import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";

/**
 * Section 11.9.8.1 — typed, site-scoped QR references. Opaque tokens rotate
 * via append-only site_qr_reference_rotations (never UPDATE token rows).
 */
export const siteQrReferences = pgTable(
  "site_qr_references",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    qrTypeCode: uuid("qr_type_code")
      .notNull()
      .references(() => typeDefinition.id),
    label: text("label"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_site_qr_references_org_site").on(t.organisationId, t.siteId),
    uniqueIndex("idx_site_qr_references_org_site_type").on(
      t.organisationId,
      t.siteId,
      t.qrTypeCode,
    ),
  ],
);

/** Append-only rotation log — corrections are new rows, not UPDATEs. */
export const siteQrReferenceRotations = pgTable(
  "site_qr_reference_rotations",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    siteQrReferenceId: uuid("site_qr_reference_id")
      .notNull()
      .references(() => siteQrReferences.id),
    opaqueTokenHmac: text("opaque_token_hmac").notNull(),
    activeFrom: timestamp("active_from", { withTimezone: true }).notNull(),
    activeUntil: timestamp("active_until", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_site_qr_reference_rotations_org_site_active").on(
      t.organisationId,
      t.siteId,
      t.activeUntil,
    ),
    index("idx_site_qr_reference_rotations_reference").on(t.siteQrReferenceId, t.activeFrom),
  ],
);

export type SiteQrReference = typeof siteQrReferences.$inferSelect;
export type SiteQrReferenceRotation = typeof siteQrReferenceRotations.$inferSelect;
