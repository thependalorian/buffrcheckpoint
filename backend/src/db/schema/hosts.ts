import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisationUnits } from "./organisation-units";
import { organisations } from "./organisations";
import { sites } from "./sites";

// Section 11.3's "Host / Staff Directory" — distinct from application_users:
// a host is who a visit is notified to, not necessarily someone who logs
// into the admin app. Renamed `host` -> `site_hosts`; name/contact_reference
// carry a ProtectedPersonalDataEnvelope (jsonb) instead of a plain
// encrypted/hash text-column pair, matching the Canonical Engineering
// Constitution's PII shape. organisation_unit_id links into the BIAN-shaped
// organisation directory when populated.
export const siteHosts = pgTable(
  "site_hosts",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    organisationUnitId: uuid("organisation_unit_id").references(() => organisationUnits.id),
    hostNameProtected: jsonb("host_name_protected"),
    hostNameLookupHmac: text("host_name_lookup_hmac"),
    department: text("department"),
    hostContactProtected: jsonb("host_contact_protected"),
    hostContactLookupHmac: text("host_contact_lookup_hmac"),
    active: boolean("active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_site_hosts_org_site").on(t.organisationId, t.siteId)],
);

export type SiteHost = typeof siteHosts.$inferSelect;
export type NewSiteHost = typeof siteHosts.$inferInsert;
