import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { checkInFormVersions } from "./form-templates";
import { organisations } from "./organisations";
import { visitorVisits } from "./visits";

export const visitFormAnswers = pgTable(
  "visit_form_answers",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visitorVisits.id),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => checkInFormVersions.id),
    fieldCode: text("field_code").notNull(),
    answerValue: jsonb("answer_value").notNull().default({}),
    fieldLabelSnapshot: text("field_label_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_visit_form_answers_org_visit").on(t.organisationId, t.visitId)],
);
