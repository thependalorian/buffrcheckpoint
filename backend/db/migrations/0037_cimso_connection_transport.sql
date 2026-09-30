-- CiMSO connection transport columns + missing status seed.
-- ALTER only — do not recreate 0036 pms_* tables.

INSERT INTO type_definition (domain, code, label, sort_order)
SELECT v.domain, v.code, v.label, v.sort_order
FROM (VALUES
  ('pms_connection_status', 'awaiting_property_credentials', 'Awaiting property credentials', 6)
) AS v(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition td
  WHERE td.domain = v.domain AND td.code = v.code AND td.deleted_at IS NULL
);

ALTER TABLE pms_integration_connections
  ADD COLUMN IF NOT EXISTS tcp_host text,
  ADD COLUMN IF NOT EXISTS tcp_port integer,
  ADD COLUMN IF NOT EXISTS tls_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS client_login_id text,
  ADD COLUMN IF NOT EXISTS credentials_secret_ref text,
  ADD COLUMN IF NOT EXISTS server_serial_number text,
  ADD COLUMN IF NOT EXISTS default_host_id uuid REFERENCES site_hosts (id);

UPDATE platform_capability_approvals pca
SET
  evidence_reference = 'INNterchange spec package received (June 2026). TCP client + per-site transport pending. Org enablement + connect available while targeted.',
  updated_at = now()
FROM type_definition cc
WHERE pca.capability_code = cc.id
  AND cc.domain = 'capability_code'
  AND cc.code = 'cimso_innterchange'
  AND cc.deleted_at IS NULL;
