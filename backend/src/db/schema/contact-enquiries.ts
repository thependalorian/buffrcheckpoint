import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

export const contactEnquiries = pgTable(
  "contact_enquiries",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id").references(() => organisations.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    message: text("message").notNull(),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_contact_enquiries_created").on(t.createdAt)],
);

export const contactEnquiryStatusLog = pgTable(
  "contact_enquiry_status_log",
  {
    id: uuid("id").primaryKey(),
    enquiryId: uuid("enquiry_id")
      .notNull()
      .references(() => contactEnquiries.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
    changedBy: uuid("changed_by"),
    reason: text("reason"),
  },
  (t) => [index("idx_contact_enquiry_status_log_enquiry").on(t.enquiryId, t.changedAt)],
);
