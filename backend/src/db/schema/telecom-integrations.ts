import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// The feature-phone (USSD) session tables were retired with USSD (2026-10-07). The database tables are kept for history until the owner
// approves a drop; nothing reads or writes them.
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
