-- ============================================================================
-- Buffr Checkpoint — gap-closure phases 2-8 (buffrcheckpoint.md Section 11.9).
--
-- Covers, in one migration because they ship together:
--   1. site_status type_definition rows (SitesService.setStatusForOrganisation
--      already resolves 'site_status' codes — the domain was never seeded, so
--      every call threw).
--   2. platform_notification_template (+ append-only change log) — editable
--      subject/body for the handful of template codes the backend actually
--      sends, instead of hardcoded strings in service files.
--   3. platform_configuration_setting (+ append-only change log) — audited
--      JSONB config. First consumer: organisation-health.service.ts's
--      scorecard weights, previously private constants in TypeScript.
--   4. organisation_access_review_log — append-only membership attestation
--      outcomes, replacing admin/'s "Access Reviews Coming Soon" placeholder.
--   5. New permission codes: customer KYB submission and customer support
--      ticketing get their own codes (both rode on the broad
--      visit.history.read before this), plus platform staff/config management
--      and the customer-side access-review code.
--
-- Wiebe rules: UUID PKs generated client-side (type_definition is the
-- documented exception), soft deletes on stateful tables, an append-only
-- companion log created at the same time as each stateful table, no triggers,
-- no ON DELETE CASCADE, type_definition FKs instead of enums/CHECK lists.
-- ============================================================================

-- ============================================================================
-- 1. type_definition seed rows
-- ============================================================================

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  -- Site lifecycle. sites.status_code has existed since 0001 and
  -- SitesService already resolves these codes; nothing ever seeded them.
  ('site_status', 'active', 'Active', 1),
  ('site_status', 'inactive', 'Inactive', 2),
  ('site_status', 'maintenance', 'Maintenance', 3),
  ('site_status', 'closed', 'Closed', 4),
  -- Change events for the two new platform config tables. One shared domain
  -- rather than a near-identical domain per table.
  ('platform_config_change_event_type', 'created', 'Created', 1),
  ('platform_config_change_event_type', 'updated', 'Updated', 2),
  ('platform_config_change_event_type', 'deactivated', 'Deactivated', 3),
  -- Notification templates the backend genuinely sends today. Adding a
  -- fourth template is an INSERT here, not a migration on the table.
  ('notification_template_code', 'support_access_request', 'Support-access request to customer admins', 1),
  ('notification_template_code', 'password_reset', 'Password reset link', 2),
  ('notification_template_code', 'platform_staff_invitation', 'Platform staff invitation', 3),
  -- Access-review outcomes (customer-side membership attestation).
  ('access_review_outcome', 'access_confirmed', 'Access confirmed', 1),
  ('access_review_outcome', 'role_change_required', 'Role change required', 2),
  ('access_review_outcome', 'access_revocation_required', 'Access revocation required', 3),
  ('access_review_outcome', 'needs_follow_up', 'Needs follow-up', 4)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

-- Existing sites predate the domain — give them an explicit 'active' status
-- rather than leaving status_code NULL and rendering "unknown" everywhere.
UPDATE sites
SET status_code = (SELECT id FROM type_definition WHERE domain = 'site_status' AND code = 'active')
WHERE status_code IS NULL AND deleted_at IS NULL;

-- ============================================================================
-- 2. platform_notification_template
--
-- Platform-wide, not per-tenant: the same operational copy goes to every
-- organisation (same tenancy exception as platform_incident /
-- platform_capability_status). Body/subject carry {{placeholder}} tokens
-- rendered in application code.
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_notification_template (
  id                    UUID PRIMARY KEY,
  template_code         UUID NOT NULL REFERENCES type_definition (id),
  channel_code          UUID NOT NULL REFERENCES type_definition (id),
  subject               TEXT NULL,
  body                  TEXT NOT NULL,
  updated_by            UUID NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_notification_template_code
  ON platform_notification_template (template_code, channel_code) WHERE deleted_at IS NULL;

-- Append-only companion: no updated_at, no UPDATE, corrections are new rows.
CREATE TABLE IF NOT EXISTS platform_notification_template_status_log (
  id                    UUID PRIMARY KEY,
  template_id           UUID NOT NULL REFERENCES platform_notification_template (id),
  event_type_code       UUID NOT NULL REFERENCES type_definition (id),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id              UUID NULL,
  before_value          JSONB NULL,
  after_value           JSONB NULL,
  note                  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_notification_template_status_log_template
  ON platform_notification_template_status_log (template_id, occurred_at);

-- Seed the current hardcoded copy so editing starts from what already ships,
-- not from an empty box. Text matches support-sessions.service.ts and
-- auth.service.ts as of this migration.
INSERT INTO platform_notification_template (id, template_code, channel_code, subject, body)
SELECT
  gen_random_uuid(),
  tc.id,
  ch.id,
  d.subject,
  d.body
FROM (VALUES
  (
    'support_access_request',
    'Action needed: Buffr Checkpoint support-access request',
    'Buffr Checkpoint''s internal support team has requested time-boxed access to {{organisationName}}''s account for support purposes.' || chr(10) || chr(10) ||
    'Review and approve or deny this request from your admin dashboard under Support Access.' || chr(10) || chr(10) ||
    'No access is granted until you approve it, and it automatically expires after the approved window.'
  ),
  (
    'password_reset',
    'Reset your Buffr Checkpoint password',
    'Password reset requested. Open: {{resetUrl}}'
  ),
  (
    'platform_staff_invitation',
    'You have been invited to Buffr Checkpoint Platform Ops',
    'A Buffr Checkpoint platform administrator invited you to the internal Platform Ops console.' || chr(10) || chr(10) ||
    'Set your password to activate the account: {{resetUrl}}' || chr(10) || chr(10) ||
    'This link expires in one hour. Request a new one from the sign-in page if it lapses.'
  )
) AS d(template_code, subject, body)
JOIN type_definition tc ON tc.domain = 'notification_template_code' AND tc.code = d.template_code
JOIN type_definition ch ON ch.domain = 'notification_channel' AND ch.code = 'email'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_notification_template t
  WHERE t.template_code = tc.id AND t.channel_code = ch.id AND t.deleted_at IS NULL
);

INSERT INTO platform_notification_template_status_log (id, template_id, event_type_code, after_value, note)
SELECT
  gen_random_uuid(),
  t.id,
  ev.id,
  jsonb_build_object('subject', t.subject, 'body', t.body),
  'seeded from migration 0029'
FROM platform_notification_template t
CROSS JOIN type_definition ev
WHERE ev.domain = 'platform_config_change_event_type' AND ev.code = 'created'
  AND NOT EXISTS (
    SELECT 1 FROM platform_notification_template_status_log l WHERE l.template_id = t.id
  );

-- ============================================================================
-- 3. platform_configuration_setting — audited JSONB platform config
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_configuration_setting (
  id                    UUID PRIMARY KEY,
  setting_key           TEXT NOT NULL,
  setting_value         JSONB NOT NULL,
  description           TEXT NULL,
  updated_by            UUID NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_configuration_setting_key
  ON platform_configuration_setting (setting_key) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS platform_configuration_setting_status_log (
  id                    UUID PRIMARY KEY,
  setting_id            UUID NOT NULL REFERENCES platform_configuration_setting (id),
  event_type_code       UUID NOT NULL REFERENCES type_definition (id),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id              UUID NULL,
  before_value          JSONB NULL,
  after_value           JSONB NULL,
  note                  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_configuration_setting_status_log_setting
  ON platform_configuration_setting_status_log (setting_id, occurred_at);

-- Seed the health-score weights currently hardcoded in
-- organisation-health.service.ts's scoreFrom(). Same numbers, so seeding
-- changes no score; it just makes them tunable and audited.
INSERT INTO platform_configuration_setting (id, setting_key, setting_value, description)
SELECT
  gen_random_uuid(),
  'organisation_health_score_weights',
  jsonb_build_object(
    'baseScore', 100,
    'visitVolumeTrendWeight', 40,
    'visitVolumeTrendFloor', -40,
    'visitVolumeTrendCeiling', 20,
    'adminLoginRecencyPerDay', 1,
    'adminLoginRecencyCap', 30,
    'notificationFailureWeight', 20,
    'deviceOfflineWeight', 20,
    'lowRiskBandFloor', 70,
    'mediumRiskBandFloor', 40
  ),
  'Weighted-scorecard inputs for the organisation health/churn score (0-100).'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_configuration_setting
  WHERE setting_key = 'organisation_health_score_weights' AND deleted_at IS NULL
);

INSERT INTO platform_configuration_setting_status_log (id, setting_id, event_type_code, after_value, note)
SELECT gen_random_uuid(), s.id, ev.id, s.setting_value, 'seeded from migration 0029'
FROM platform_configuration_setting s
CROSS JOIN type_definition ev
WHERE ev.domain = 'platform_config_change_event_type' AND ev.code = 'created'
  AND NOT EXISTS (
    SELECT 1 FROM platform_configuration_setting_status_log l WHERE l.setting_id = s.id
  );

-- ============================================================================
-- 4. organisation_access_review_log — append-only membership attestation
--
-- Each row is already a point-in-time record (same construction as
-- organisation_health_snapshot), so no soft delete and no companion log:
-- a corrected attestation is a new row, never an edit.
-- ============================================================================

CREATE TABLE IF NOT EXISTS organisation_access_review_log (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  membership_id         UUID NULL REFERENCES organisation_memberships (id),
  reviewed_user_id      UUID NOT NULL REFERENCES application_users (id),
  reviewed_role_code    UUID NULL REFERENCES type_definition (id),
  outcome_code          UUID NOT NULL REFERENCES type_definition (id),
  reviewer_id           UUID NOT NULL,
  note                  TEXT NULL,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organisation_access_review_log_org
  ON organisation_access_review_log (organisation_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_organisation_access_review_log_user
  ON organisation_access_review_log (reviewed_user_id, occurred_at);

-- ============================================================================
-- 5. Permission codes + role grants
-- ============================================================================

INSERT INTO permission_definitions (permission_code, description, risk_classification) VALUES
  ('organisation.kyb.submit', 'Submit and read your own organisation''s KYB verification', 'elevated'),
  ('support_ticket.customer.manage', 'Open and comment on your own organisation''s support tickets', 'standard'),
  ('access_review.manage', 'Run and record access reviews over your organisation''s memberships', 'elevated'),
  ('platform.staff.manage', 'Invite, re-role, and deactivate Buffr platform-support staff accounts', 'critical'),
  ('platform.configuration.manage', 'Edit platform notification templates and scoring configuration', 'elevated'),
  ('platform.device.manage', 'Change a customer''s device or site compliance status from the Platform Ops Console', 'elevated')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permission_grants (role_code, permission_code)
  SELECT td.id, p.permission_code
  FROM type_definition td
  CROSS JOIN (VALUES
    -- Customer-side. KYB submission and support ticketing were both gated on
    -- visit.history.read, which every read-only reporting role also holds.
    ('owner_operator', 'organisation.kyb.submit'),
    ('system_administrator', 'organisation.kyb.submit'),
    ('owner_operator', 'support_ticket.customer.manage'),
    ('system_administrator', 'support_ticket.customer.manage'),
    ('site_manager', 'support_ticket.customer.manage'),
    ('owner_operator', 'access_review.manage'),
    ('system_administrator', 'access_review.manage'),
    ('compliance_audit_officer', 'access_review.manage'),
    -- Buffr-internal only.
    ('platform_support', 'platform.staff.manage'),
    ('platform_support', 'platform.configuration.manage'),
    -- Still requires an active support grant against the target org at call
    -- time (PlatformScoped on the route); the permission alone is not access.
    ('platform_support', 'platform.device.manage')
  ) AS grants(role_code, permission_code)
  JOIN permission_definitions p ON p.permission_code = grants.permission_code
  WHERE td.domain = 'role_code' AND td.code = grants.role_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
