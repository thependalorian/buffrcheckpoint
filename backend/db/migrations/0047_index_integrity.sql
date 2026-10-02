-- Buffr Checkpoint — restore indexes lost in the 0008 canonical rename and
-- give every tenant table an index that starts with organisation_id.
--
-- Found on 2 October 2026 by auditing production against every migration
-- file: 0008 recreated the tables under canonical names but did not recreate
-- some 0001 indexes, including the open-visits index behind the live roster
-- and the unique credential reference. Production had no duplicate credential
-- references before the unique index was added (checked: 0).
--
-- Additive only. No triggers, no cascades.

-- Live roster "on site now" lookups (was idx_visit_org_open in 0001).
CREATE INDEX IF NOT EXISTS idx_visitor_visits_org_site_open
  ON visitor_visits (organisation_id, site_id)
  WHERE deleted_at IS NULL AND checked_out_at IS NULL;

-- One live credential per reference per organisation (was idx_credential_token).
CREATE UNIQUE INDEX IF NOT EXISTS uq_access_credentials_org_reference
  ON access_credentials (organisation_id, credential_reference_hmac)
  WHERE deleted_at IS NULL;

-- Tenant-leading indexes for tables that had none.
CREATE INDEX IF NOT EXISTS idx_credential_site_entitlements_org_credential
  ON credential_site_entitlements (organisation_id, credential_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_credential_use_events_org_credential_occurred
  ON credential_use_events (organisation_id, credential_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_credential_use_events_org_device_occurred
  ON credential_use_events (organisation_id, device_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_feature_phone_check_in_sessions_org_site_opened
  ON feature_phone_check_in_sessions (organisation_id, site_id, opened_at);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_instructions_org_next_attempt
  ON notification_delivery_instructions (organisation_id, next_attempt_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contact_enquiries_org_created
  ON contact_enquiries (organisation_id, created_at DESC)
  WHERE deleted_at IS NULL;
