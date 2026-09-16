import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { managedKioskDevices } from "./managed-kiosk-devices";
import { organisations } from "./organisations";
import { visitorPolicyVersions } from "./consent";
import { typeDefinition } from "./type-definitions";
import { sites } from "./sites";

/** Append-only — privacy notice shown and accepted before a visit row exists. */
export const kioskPrivacyPreCheckinAcknowledgements = pgTable(
  "kiosk_privacy_pre_checkin_acknowledgements",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    kioskSessionId: uuid("kiosk_session_id").notNull(),
    policyVersionId: uuid("policy_version_id")
      .notNull()
      .references(() => visitorPolicyVersions.id),
    legalBasisCode: uuid("legal_basis_code")
      .notNull()
      .references(() => typeDefinition.id),
    languageShownCode: uuid("language_shown_code")
      .notNull()
      .references(() => typeDefinition.id),
    acknowledgementMethodCode: uuid("acknowledgement_method_code")
      .notNull()
      .references(() => typeDefinition.id),
    displayedAt: timestamp("displayed_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    deviceId: uuid("device_id").references(() => managedKioskDevices.id),
    captureChannelCode: uuid("capture_channel_code").references(() => typeDefinition.id),
  },
  (t) => [
    index("idx_kiosk_privacy_pre_checkin_ack_org_site").on(t.organisationId, t.siteId, t.displayedAt),
    uniqueIndex("idx_kiosk_privacy_pre_checkin_ack_session").on(t.kioskSessionId),
  ],
);
