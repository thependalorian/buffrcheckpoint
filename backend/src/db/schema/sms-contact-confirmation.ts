import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { sites } from "./sites";
import { featurePhoneCheckInSessions } from "./telecom-integrations";
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

export const featurePhoneCheckInSessionStatusLog = pgTable(
  "feature_phone_check_in_session_status_log",
  {
    id: uuid("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => featurePhoneCheckInSessions.id),
    statusCode: text("status_code").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    reason: text("reason"),
  },
  (t) => [index("idx_fp_session_status_log").on(t.sessionId, t.occurredAt)],
);
