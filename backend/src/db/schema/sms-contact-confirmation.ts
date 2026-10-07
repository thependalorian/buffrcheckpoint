import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { sites } from "./sites";
import { visitorVisits } from "./visits";

export const smsContactConfirmationEvents = pgTable(
  "sms_contact_confirmation_events",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    visitId: uuid("visit_id").references(() => visitorVisits.id),
    siteId: uuid("site_id").references(() => sites.id),
    providerCode: text("provider_code").notNull(),
    recipientReferenceHmac: text("recipient_reference_hmac").notNull(),
    messageReference: text("message_reference").notNull(),
    outcomeCode: text("outcome_code").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_sms_confirmation_org_visit").on(t.organisationId, t.visitId, t.occurredAt)],
);
