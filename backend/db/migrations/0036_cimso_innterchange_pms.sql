-- CiMSO INNterchange / PMS integration prep (Buffr Checkpoint)
-- Org+site scoped connection rows, room↔zone mappings, immutable sync log,
-- and external entity links. Secrets stay in env/secret manager — never in
-- these tables. Live message catalogue remains AFTER_NDA.

-- ---------------------------------------------------------------------------
-- Type definitions (idempotent)
-- ---------------------------------------------------------------------------

INSERT INTO type_definition (domain, code, label, sort_order)
SELECT v.domain, v.code, v.label, v.sort_order
FROM (VALUES
  ('capability_code', 'cimso_innterchange', 'CiMSO INNterchange (PMS)', 20),
  ('pms_provider_code', 'cimso_innterchange', 'CiMSO INNterchange', 1),
  ('pms_connection_status', 'not_configured', 'Not configured', 1),
  ('pms_connection_status', 'awaiting_nda_package', 'Awaiting NDA package', 2),
  ('pms_connection_status', 'configured', 'Configured', 3),
  ('pms_connection_status', 'sync_error', 'Sync error', 4),
  ('pms_connection_status', 'disabled', 'Disabled', 5),
  ('pms_sync_run_outcome', 'success', 'Success', 1),
  ('pms_sync_run_outcome', 'partial', 'Partial', 2),
  ('pms_sync_run_outcome', 'failed', 'Failed', 3),
  ('pms_sync_run_outcome', 'skipped_after_nda', 'Skipped - AFTER_NDA', 4),
  ('pms_external_entity_kind', 'reservation', 'Lodging reservation', 1),
  ('pms_external_entity_kind', 'front_desk_event', 'Front-desk event', 2),
  ('capability_status_value', 'provider_testing', 'Provider testing', 10)
) AS v(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition td
  WHERE td.domain = v.domain AND td.code = v.code AND td.deleted_at IS NULL
);

-- Platform public status: targeted (honest — NDA package not in hand)
INSERT INTO platform_capability_approvals (
  id, capability_code, status_code, public_display_status, evidence_reference, updated_at
)
SELECT
  gen_random_uuid(),
  cc.id,
  sv.id,
  pv.id,
  'CiMSO INNterchange beachhead: adapter scaffold + registration answers. Live sync AFTER_NDA.',
  now()
FROM type_definition cc
JOIN type_definition sv
  ON sv.domain = 'capability_status_value' AND sv.code = 'provider_testing' AND sv.deleted_at IS NULL
JOIN type_definition pv
  ON pv.domain = 'public_capability_status_value' AND pv.code = 'targeted' AND pv.deleted_at IS NULL
WHERE cc.domain = 'capability_code'
  AND cc.code = 'cimso_innterchange'
  AND cc.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM platform_capability_approvals pca
    WHERE pca.capability_code = cc.id
  );

-- ---------------------------------------------------------------------------
-- Operational tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pms_integration_connections (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations (id),
  site_id uuid NOT NULL REFERENCES sites (id),
  provider_code uuid NOT NULL REFERENCES type_definition (id),
  status_code uuid NOT NULL REFERENCES type_definition (id),
  site_external_id text,
  enabled_interface_types integer[] NOT NULL DEFAULT '{}',
  last_sync_at timestamptz,
  last_error_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pms_connections_org_site_provider_active
  ON pms_integration_connections (organisation_id, site_id, provider_code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pms_connections_org_active
  ON pms_integration_connections (organisation_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS pms_integration_connection_status_log (
  id uuid PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES pms_integration_connections (id),
  status_code uuid NOT NULL REFERENCES type_definition (id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  reason text
);

CREATE INDEX IF NOT EXISTS idx_pms_connection_status_log
  ON pms_integration_connection_status_log (connection_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS pms_room_zone_mappings (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations (id),
  site_id uuid NOT NULL REFERENCES sites (id),
  connection_id uuid NOT NULL REFERENCES pms_integration_connections (id),
  room_code text NOT NULL,
  security_zone_id uuid NOT NULL REFERENCES security_zones (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pms_room_zone_active
  ON pms_room_zone_mappings (organisation_id, site_id, connection_id, room_code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pms_room_zone_org_site
  ON pms_room_zone_mappings (organisation_id, site_id)
  WHERE deleted_at IS NULL;

-- Immutable sync attempts (no updated_at, no UPDATE path in app code)
CREATE TABLE IF NOT EXISTS pms_sync_run_log (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations (id),
  site_id uuid NOT NULL REFERENCES sites (id),
  connection_id uuid NOT NULL REFERENCES pms_integration_connections (id),
  direction_code text NOT NULL,
  outcome_code uuid NOT NULL REFERENCES type_definition (id),
  records_seen integer NOT NULL DEFAULT 0,
  records_applied integer NOT NULL DEFAULT 0,
  error_code text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  detail_json jsonb
);

CREATE INDEX IF NOT EXISTS idx_pms_sync_run_org_site
  ON pms_sync_run_log (organisation_id, site_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_pms_sync_run_connection
  ON pms_sync_run_log (connection_id, started_at DESC);

CREATE TABLE IF NOT EXISTS pms_external_entity_links (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations (id),
  site_id uuid NOT NULL REFERENCES sites (id),
  connection_id uuid NOT NULL REFERENCES pms_integration_connections (id),
  entity_kind_code uuid NOT NULL REFERENCES type_definition (id),
  external_entity_id text NOT NULL,
  invitation_id uuid REFERENCES visit_invitations (id),
  visit_id uuid REFERENCES visitor_visits (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pms_external_entity_active
  ON pms_external_entity_links (organisation_id, connection_id, entity_kind_code, external_entity_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pms_external_entity_org_site
  ON pms_external_entity_links (organisation_id, site_id)
  WHERE deleted_at IS NULL;
