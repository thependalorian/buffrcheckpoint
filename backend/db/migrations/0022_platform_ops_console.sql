-- Buffr Checkpoint — Platform Ops Console: schema foundation.
-- Internal Buffr-staff console (platform_support role), separate from the
-- customer admin/ app — see buffrcheckpoint.md Section 11.9.1. Covers:
-- support sessions (break-glass "act as org" mechanism), platform incidents,
-- support tickets, org health/churn snapshots, billing (manual EFT + POP
-- reconciliation — no PSP integration yet), CRM, and KYB.
--
-- Wiebe: UUID PKs, organisation_id tenancy (except the documented
-- platform-wide tables, same tenancy exception as platform_capability_approvals),
-- soft deletes, type_definition FKs, status event companions, zero triggers,
-- zero ON DELETE CASCADE. Money columns are NUMERIC(15,2) + currency_code
-- CHAR(3) throughout, no exceptions (CLAUDE.md workspace rule §2).

-- ============================================================================
-- Support sessions (break-glass "act as org" mechanism)
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_support_session (
  id                    UUID PRIMARY KEY,
  platform_user_id      UUID NOT NULL,
  grant_id              UUID NOT NULL REFERENCES privileged_access_grants (id),
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  issued_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL,
  revoked_at            TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_support_session_user
  ON platform_support_session (platform_user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_platform_support_session_org
  ON platform_support_session (organisation_id);

-- Append-only. Every write made under an active support session is recorded
-- here (never in the org's own audit_events hash chain — keeps that chain's
-- single-tenant invariants undisturbed).
CREATE TABLE IF NOT EXISTS platform_support_audit_events (
  id                    UUID PRIMARY KEY,
  support_session_id    UUID NOT NULL REFERENCES platform_support_session (id),
  platform_user_id      UUID NOT NULL,
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  entity_type           TEXT NOT NULL,
  entity_id             UUID NOT NULL,
  action                TEXT NOT NULL,
  before_value           JSONB NULL,
  after_value            JSONB NULL,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_support_audit_events_org
  ON platform_support_audit_events (organisation_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_platform_support_audit_events_session
  ON platform_support_audit_events (support_session_id);

-- Close a real gap found while building this: RbacGuard's existing
-- platform_support grant lookup only checks *a* grant exists for the user,
-- never that it matches the org being accessed. This column lets the
-- application layer (RbacGuard + support-session minting) enforce that
-- match explicitly and auditably. (No schema change needed to
-- privileged_access_grants itself — it already has organisation_id.)

-- ============================================================================
-- Dual-approval fix for platform_capability_approvals (buffrcheckpoint.md
-- Section 9.2/L7901 promised "dual approval"; schema only had one approver)
-- ============================================================================

ALTER TABLE platform_capability_approvals
  ADD COLUMN IF NOT EXISTS secondary_approved_by UUID NULL,
  ADD COLUMN IF NOT EXISTS secondary_approved_at TIMESTAMPTZ NULL;

-- ============================================================================
-- Namibia region on sites (for the regional choropleth) — the existing
-- `regions` table is per-organisation internal structure, not Namibia's 14
-- administrative regions, so this is a genuinely new field.
-- ============================================================================

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS namibia_region_code UUID NULL REFERENCES type_definition (id);

-- Last-login tracking on application_users — used by the health/churn
-- scorecard's "admin login recency" signal; didn't exist before this.
ALTER TABLE application_users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL;

-- ============================================================================
-- Platform incidents
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_incident (
  id                    UUID PRIMARY KEY,
  title                 TEXT NOT NULL,
  description           TEXT NULL,
  severity_code         UUID NOT NULL REFERENCES type_definition (id),
  status_code           UUID NOT NULL REFERENCES type_definition (id),
  opened_by             UUID NOT NULL,
  opened_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ NULL,
  deleted_at            TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_incident_status
  ON platform_incident (status_code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS platform_incident_status_events (
  id                    UUID PRIMARY KEY,
  incident_id           UUID NOT NULL REFERENCES platform_incident (id),
  from_status_code      UUID NULL REFERENCES type_definition (id),
  to_status_code        UUID NOT NULL REFERENCES type_definition (id),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id              UUID NULL,
  note                  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_incident_status_events_incident
  ON platform_incident_status_events (incident_id, occurred_at);

CREATE TABLE IF NOT EXISTS platform_incident_affected_organisations (
  id                    UUID PRIMARY KEY,
  incident_id           UUID NOT NULL REFERENCES platform_incident (id),
  organisation_id       UUID NOT NULL REFERENCES organisations (id)
);

CREATE INDEX IF NOT EXISTS idx_platform_incident_affected_org
  ON platform_incident_affected_organisations (organisation_id);

-- ============================================================================
-- Support tickets (real in-console ticketing, per product decision)
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_ticket (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NULL REFERENCES organisations (id),
  subject               TEXT NOT NULL,
  description           TEXT NULL,
  severity_code         UUID NOT NULL REFERENCES type_definition (id),
  status_code           UUID NOT NULL REFERENCES type_definition (id),
  requested_by          UUID NULL,
  assigned_to           UUID NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_org
  ON support_ticket (organisation_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_support_ticket_status
  ON support_ticket (status_code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS support_ticket_status_events (
  id                    UUID PRIMARY KEY,
  ticket_id             UUID NOT NULL REFERENCES support_ticket (id),
  from_status_code      UUID NULL REFERENCES type_definition (id),
  to_status_code        UUID NOT NULL REFERENCES type_definition (id),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id              UUID NULL,
  note                  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_status_events_ticket
  ON support_ticket_status_events (ticket_id, occurred_at);

CREATE TABLE IF NOT EXISTS support_ticket_comments (
  id                    UUID PRIMARY KEY,
  ticket_id             UUID NOT NULL REFERENCES support_ticket (id),
  author_id             UUID NOT NULL,
  body                  TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_ticket
  ON support_ticket_comments (ticket_id, created_at);

-- ============================================================================
-- Organisation health / churn snapshots (append-only — each row is already
-- a point-in-time log entry by construction, no companion status table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organisation_health_snapshot (
  id                        UUID PRIMARY KEY,
  organisation_id           UUID NOT NULL REFERENCES organisations (id),
  computed_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_volume_trend        NUMERIC(6,3) NULL,
  admin_login_recency_days  INT NULL,
  notification_failure_rate NUMERIC(5,4) NULL,
  device_offline_rate       NUMERIC(5,4) NULL,
  health_score              NUMERIC(5,2) NOT NULL,
  churn_risk_band_code      UUID NOT NULL REFERENCES type_definition (id)
);

CREATE INDEX IF NOT EXISTS idx_organisation_health_snapshot_org
  ON organisation_health_snapshot (organisation_id, computed_at);

CREATE INDEX IF NOT EXISTS idx_organisation_health_snapshot_band
  ON organisation_health_snapshot (churn_risk_band_code, computed_at);

-- ============================================================================
-- Billing: subscriptions, invoices, payments (manual EFT + POP, no PSP yet)
-- ============================================================================

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS lifecycle_stage_code UUID NULL REFERENCES type_definition (id);

CREATE TABLE IF NOT EXISTS organisation_subscription (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  plan_code             UUID NOT NULL REFERENCES type_definition (id),
  mrr_amount            NUMERIC(15,2) NOT NULL,
  currency_code         CHAR(3) NOT NULL DEFAULT 'NAD',
  status_code           UUID NOT NULL REFERENCES type_definition (id),
  kyb_gate_passed       BOOLEAN NOT NULL DEFAULT FALSE,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end    TIMESTAMPTZ NULL,
  deleted_at            TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_organisation_subscription_org
  ON organisation_subscription (organisation_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS organisation_subscription_status_events (
  id                    UUID PRIMARY KEY,
  subscription_id       UUID NOT NULL REFERENCES organisation_subscription (id),
  from_status_code      UUID NULL REFERENCES type_definition (id),
  to_status_code        UUID NOT NULL REFERENCES type_definition (id),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id              UUID NULL,
  note                  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_organisation_subscription_status_events_sub
  ON organisation_subscription_status_events (subscription_id, occurred_at);

CREATE TABLE IF NOT EXISTS invoice (
  id                        UUID PRIMARY KEY,
  organisation_id           UUID NOT NULL REFERENCES organisations (id),
  invoice_number            TEXT NOT NULL,
  amount                    NUMERIC(15,2) NOT NULL,
  currency_code             CHAR(3) NOT NULL DEFAULT 'NAD',
  status_code               UUID NOT NULL REFERENCES type_definition (id),
  issued_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at                    TIMESTAMPTZ NULL,
  deleted_at                TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_number
  ON invoice (invoice_number);

CREATE INDEX IF NOT EXISTS idx_invoice_org
  ON invoice (organisation_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS invoice_line_item (
  id                    UUID PRIMARY KEY,
  invoice_id            UUID NOT NULL REFERENCES invoice (id),
  description           TEXT NOT NULL,
  amount                NUMERIC(15,2) NOT NULL,
  quantity              INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_item_invoice
  ON invoice_line_item (invoice_id);

-- Corrections to an issued invoice are credit notes, never an UPDATE on the
-- issued row (Wiebe: log/ledger rows immutable).
CREATE TABLE IF NOT EXISTS invoice_credit_note (
  id                    UUID PRIMARY KEY,
  invoice_id            UUID NOT NULL REFERENCES invoice (id),
  amount                NUMERIC(15,2) NOT NULL,
  currency_code         CHAR(3) NOT NULL DEFAULT 'NAD',
  reason                TEXT NOT NULL,
  issued_by             UUID NOT NULL,
  issued_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_credit_note_invoice
  ON invoice_credit_note (invoice_id);

-- Append-only payment ledger. A rejected/corrected POP is a new row
-- referencing the original, never an edit.
CREATE TABLE IF NOT EXISTS payment_transaction (
  id                        UUID PRIMARY KEY,
  organisation_id           UUID NOT NULL REFERENCES organisations (id),
  invoice_id                UUID NULL REFERENCES invoice (id),
  amount                    NUMERIC(15,2) NOT NULL,
  currency_code             CHAR(3) NOT NULL DEFAULT 'NAD',
  status_code               UUID NOT NULL REFERENCES type_definition (id),
  payment_method_code       UUID NOT NULL REFERENCES type_definition (id),
  pop_document_reference    TEXT NULL,
  submitted_by              UUID NULL,
  supersedes_transaction_id UUID NULL REFERENCES payment_transaction (id),
  occurred_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transaction_org
  ON payment_transaction (organisation_id);

CREATE INDEX IF NOT EXISTS idx_payment_transaction_invoice
  ON payment_transaction (invoice_id);

CREATE INDEX IF NOT EXISTS idx_payment_transaction_status
  ON payment_transaction (status_code);

-- Manual-review reconciliation artifact — required before a transaction can
-- leave pending_review (CLAUDE.md §2: "every money movement has a
-- reconciliation artifact").
CREATE TABLE IF NOT EXISTS payment_reconciliation_log (
  id                    UUID PRIMARY KEY,
  payment_transaction_id UUID NOT NULL REFERENCES payment_transaction (id),
  reviewed_by           UUID NOT NULL,
  decision              TEXT NOT NULL, -- 'confirmed' | 'rejected'
  note                  TEXT NULL,
  reconciled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_log_txn
  ON payment_reconciliation_log (payment_transaction_id);

-- ============================================================================
-- CRM
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_contact (
  id                            UUID PRIMARY KEY,
  organisation_id               UUID NOT NULL REFERENCES organisations (id),
  contact_name_protected        JSONB NOT NULL,
  contact_email_protected       JSONB NULL,
  contact_phone_protected       JSONB NULL,
  role_title                    TEXT NULL,
  is_primary                    BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at                    TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_org
  ON crm_contact (organisation_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm_deal (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NULL REFERENCES organisations (id),
  prospect_name         TEXT NULL,
  stage_code            UUID NOT NULL REFERENCES type_definition (id),
  expected_mrr          NUMERIC(15,2) NULL,
  currency_code         CHAR(3) NOT NULL DEFAULT 'NAD',
  expected_close_date   DATE NULL,
  owner_id              UUID NULL,
  deleted_at            TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_deal_org
  ON crm_deal (organisation_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_deal_stage
  ON crm_deal (stage_code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm_deal_status_events (
  id                    UUID PRIMARY KEY,
  deal_id               UUID NOT NULL REFERENCES crm_deal (id),
  from_stage_code       UUID NULL REFERENCES type_definition (id),
  to_stage_code         UUID NOT NULL REFERENCES type_definition (id),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id              UUID NULL,
  note                  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_deal_status_events_deal
  ON crm_deal_status_events (deal_id, occurred_at);

CREATE TABLE IF NOT EXISTS crm_activity_log (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  actor_id              UUID NOT NULL,
  activity_type_code    UUID NOT NULL REFERENCES type_definition (id),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note                  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_activity_log_org
  ON crm_activity_log (organisation_id, occurred_at);

-- ============================================================================
-- KYB (Know Your Business) — business-identity verification at onboarding
-- ============================================================================

CREATE TABLE IF NOT EXISTS organisation_kyb_verification (
  id                                UUID PRIMARY KEY,
  organisation_id                   UUID NOT NULL REFERENCES organisations (id),
  business_registration_number      TEXT NOT NULL,
  registered_business_name          TEXT NOT NULL,
  registered_address_protected      JSONB NOT NULL,
  authorized_signatory_name_protected JSONB NOT NULL,
  registration_document_reference   TEXT NULL,
  status_code                       UUID NOT NULL REFERENCES type_definition (id),
  verified_by                       UUID NULL,
  verified_at                       TIMESTAMPTZ NULL,
  submitted_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                        TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_organisation_kyb_verification_org
  ON organisation_kyb_verification (organisation_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS organisation_kyb_status_events (
  id                    UUID PRIMARY KEY,
  kyb_verification_id   UUID NOT NULL REFERENCES organisation_kyb_verification (id),
  from_status_code      UUID NULL REFERENCES type_definition (id),
  to_status_code        UUID NOT NULL REFERENCES type_definition (id),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id              UUID NULL,
  note                  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_organisation_kyb_status_events_kyb
  ON organisation_kyb_status_events (kyb_verification_id, occurred_at);

-- ============================================================================
-- type_definition seed rows (idempotent — WHERE NOT EXISTS, matching 0015's
-- pattern). Namibia's 14 post-2013 administrative regions match
-- buffr-intelligence/frontend/src/components/illustration/namibiaRegions.ts
-- keys exactly so the map and the DB never drift.
-- ============================================================================

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('incident_severity', 'low', 'Low', 1),
  ('incident_severity', 'medium', 'Medium', 2),
  ('incident_severity', 'high', 'High', 3),
  ('incident_severity', 'critical', 'Critical', 4),
  ('incident_status', 'open', 'Open', 1),
  ('incident_status', 'investigating', 'Investigating', 2),
  ('incident_status', 'monitoring', 'Monitoring', 3),
  ('incident_status', 'resolved', 'Resolved', 4),
  ('ticket_status', 'open', 'Open', 1),
  ('ticket_status', 'in_progress', 'In progress', 2),
  ('ticket_status', 'waiting_on_customer', 'Waiting on customer', 3),
  ('ticket_status', 'resolved', 'Resolved', 4),
  ('ticket_status', 'closed', 'Closed', 5),
  ('ticket_severity', 'low', 'Low', 1),
  ('ticket_severity', 'medium', 'Medium', 2),
  ('ticket_severity', 'high', 'High', 3),
  ('ticket_severity', 'urgent', 'Urgent', 4),
  ('churn_risk_band', 'low', 'Low risk', 1),
  ('churn_risk_band', 'medium', 'Medium risk', 2),
  ('churn_risk_band', 'high', 'High risk', 3),
  ('subscription_plan', 'starter', 'Starter', 1),
  ('subscription_plan', 'growth', 'Growth', 2),
  ('subscription_plan', 'enterprise', 'Enterprise', 3),
  ('subscription_status', 'trial', 'Trial', 1),
  ('subscription_status', 'active', 'Active', 2),
  ('subscription_status', 'past_due', 'Past due', 3),
  ('subscription_status', 'cancelled', 'Cancelled', 4),
  ('invoice_status', 'draft', 'Draft', 1),
  ('invoice_status', 'sent', 'Sent', 2),
  ('invoice_status', 'paid', 'Paid', 3),
  ('invoice_status', 'overdue', 'Overdue', 4),
  ('invoice_status', 'void', 'Void', 5),
  ('payment_method', 'bank_transfer', 'Bank transfer (EFT)', 1),
  ('payment_status', 'pending_review', 'Pending review', 1),
  ('payment_status', 'confirmed', 'Confirmed', 2),
  ('payment_status', 'rejected', 'Rejected', 3),
  ('crm_lifecycle_stage', 'lead', 'Lead', 1),
  ('crm_lifecycle_stage', 'trial', 'Trial', 2),
  ('crm_lifecycle_stage', 'customer', 'Customer', 3),
  ('crm_lifecycle_stage', 'churned', 'Churned', 4),
  ('crm_deal_stage', 'prospecting', 'Prospecting', 1),
  ('crm_deal_stage', 'discovery', 'Discovery', 2),
  ('crm_deal_stage', 'proposal', 'Proposal', 3),
  ('crm_deal_stage', 'negotiation', 'Negotiation', 4),
  ('crm_deal_stage', 'won', 'Won', 5),
  ('crm_deal_stage', 'lost', 'Lost', 6),
  ('crm_activity_type', 'call', 'Call', 1),
  ('crm_activity_type', 'email', 'Email', 2),
  ('crm_activity_type', 'note', 'Note', 3),
  ('crm_activity_type', 'meeting', 'Meeting', 4),
  ('kyb_status', 'pending', 'Pending', 1),
  ('kyb_status', 'verified', 'Verified', 2),
  ('kyb_status', 'rejected', 'Rejected', 3),
  ('kyb_status', 'expired', 'Expired', 4),
  ('namibia_region', 'zambezi', 'Zambezi', 1),
  ('namibia_region', 'kavango_east', 'Kavango East', 2),
  ('namibia_region', 'kavango_west', 'Kavango West', 3),
  ('namibia_region', 'ohangwena', 'Ohangwena', 4),
  ('namibia_region', 'omusati', 'Omusati', 5),
  ('namibia_region', 'oshana', 'Oshana', 6),
  ('namibia_region', 'oshikoto', 'Oshikoto', 7),
  ('namibia_region', 'kunene', 'Kunene', 8),
  ('namibia_region', 'otjozondjupa', 'Otjozondjupa', 9),
  ('namibia_region', 'omaheke', 'Omaheke', 10),
  ('namibia_region', 'erongo', 'Erongo', 11),
  ('namibia_region', 'khomas', 'Khomas', 12),
  ('namibia_region', 'hardap', 'Hardap', 13),
  ('namibia_region', 'karas', 'ǁKaras', 14),
  ('support_access_reason', 'customer_reported_issue', 'Customer-reported issue', 1),
  ('support_access_reason', 'data_correction', 'Data correction request', 2),
  ('support_access_reason', 'billing_dispute', 'Billing dispute investigation', 3),
  ('support_access_reason', 'incident_response', 'Incident response', 4),
  ('support_access_reason', 'other', 'Other (see note)', 5)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

-- ============================================================================
-- New platform_support permissions (Ops Console). Matches the pattern in
-- db/seed/0004_canonical_permissions.sql — never granted to a customer-side
-- role.
-- ============================================================================

INSERT INTO permission_definitions (permission_code, description, risk_classification) VALUES
  ('platform.dashboard.read', 'Read platform-wide aggregate KPI dashboard', 'standard'),
  ('platform.org_health.read', 'Read organisation health/churn scores', 'standard'),
  ('platform.incident.manage', 'Create and manage platform incidents', 'elevated'),
  ('platform.ticket.manage', 'Manage support tickets', 'standard'),
  ('platform.support_session.request', 'Request a break-glass support-access grant', 'critical'),
  ('platform.support_session.mint', 'Mint a support-session token under an active grant', 'critical'),
  ('platform.billing.manage', 'Manage subscriptions, invoices, and payment review', 'elevated'),
  ('platform.crm.manage', 'Manage CRM contacts, deals, and activity log', 'standard'),
  ('platform.kyb.review', 'Review and decide KYB verification submissions', 'elevated')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permission_grants (role_code, permission_code)
  SELECT td.id, p.permission_code
  FROM type_definition td
  CROSS JOIN (VALUES
    ('platform_support', 'platform.dashboard.read'),
    ('platform_support', 'platform.org_health.read'),
    ('platform_support', 'platform.incident.manage'),
    ('platform_support', 'platform.ticket.manage'),
    ('platform_support', 'platform.support_session.request'),
    ('platform_support', 'platform.support_session.mint'),
    ('platform_support', 'platform.billing.manage'),
    ('platform_support', 'platform.crm.manage'),
    ('platform_support', 'platform.kyb.review')
  ) AS grants(role_code, permission_code)
  JOIN permission_definitions p ON p.permission_code = grants.permission_code
  WHERE td.domain = 'role_code' AND td.code = grants.role_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
