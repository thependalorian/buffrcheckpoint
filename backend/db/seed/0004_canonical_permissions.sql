-- Buffr Checkpoint — canonical permission catalogue
-- Source of truth: buffrcheckpoint.md "Canonical Engineering Constitution"
-- §5.1's checkpointPermissionCodes list, extended with a few codes the list
-- didn't cover (an "own hosted visitors" read scope for host_staff, and two
-- Buffr-Checkpoint-internal-only codes: platform break-glass support access
-- and organisation provisioning) — flagged inline, not silently added.
-- Reproduces today's ROLE_PERMISSIONS map (backend/src/common/rbac/permissions.ts)
-- as data instead of a hardcoded TS map.

INSERT INTO permission_definitions (permission_code, description, risk_classification) VALUES
  ('visit.hosted.read_own', 'Read own hosted visitors', 'standard'),
  ('visit.roster.read_live', 'Read the live on-site roster for an assigned site', 'standard'),
  ('visit.history.read', 'Read organisation-wide visit history', 'standard'),
  ('visit.arrival.record', 'Record a visitor arrival (check-in)', 'standard'),
  ('visit.departure.record', 'Record a visitor departure (check-out)', 'standard'),
  ('visit.access.approve', 'Approve or reject a visit as a host', 'standard'),
  ('site.configure', 'Configure sites, zones, and site-level settings', 'elevated'),
  ('device.provision', 'Register, transition status, and retire kiosk devices', 'elevated'),
  ('retention.configure', 'Configure organisation/site retention policies', 'elevated'),
  ('visitor.data_request.manage', 'Manage privacy/data-subject requests', 'elevated'),
  ('legal_hold.manage', 'Create and release legal holds', 'elevated'),
  ('audit_log.read', 'Read the audit event log', 'elevated'),
  ('evidence_pack.generate', 'Generate an evidence pack export', 'elevated'),
  ('role.assign', 'Change a user''s role assignment', 'elevated'),
  ('membership.manage', 'Manage organisation user accounts', 'elevated'),
  -- Buffr-Checkpoint-internal only — never granted to a customer-side role.
  ('platform.support.break_glass', 'Time-bound internal support access to a customer organisation', 'critical'),
  ('integration.configure', 'Change platform-wide capability approval status', 'critical'),
  ('organisation.provision', 'Manually provision a new customer organisation', 'critical');

INSERT INTO role_permission_grants (role_code, permission_code)
  SELECT td.id, p.permission_code
  FROM type_definition td
  CROSS JOIN (VALUES
    -- host_staff
    ('host_staff', 'visit.hosted.read_own'),
    ('host_staff', 'visit.access.approve'),
    -- front_desk_operator
    ('front_desk_operator', 'visit.roster.read_live'),
    ('front_desk_operator', 'visit.arrival.record'),
    ('front_desk_operator', 'visit.departure.record'),
    ('front_desk_operator', 'visit.access.approve'),
    -- site_manager
    ('site_manager', 'visit.roster.read_live'),
    ('site_manager', 'visit.arrival.record'),
    ('site_manager', 'visit.departure.record'),
    ('site_manager', 'visit.access.approve'),
    ('site_manager', 'site.configure'),
    ('site_manager', 'device.provision'),
    -- regional_manager
    ('regional_manager', 'visit.roster.read_live'),
    ('regional_manager', 'visit.history.read'),
    ('regional_manager', 'site.configure'),
    -- compliance_audit_officer
    ('compliance_audit_officer', 'visit.roster.read_live'),
    ('compliance_audit_officer', 'visit.history.read'),
    ('compliance_audit_officer', 'audit_log.read'),
    ('compliance_audit_officer', 'evidence_pack.generate'),
    ('compliance_audit_officer', 'retention.configure'),
    ('compliance_audit_officer', 'visitor.data_request.manage'),
    ('compliance_audit_officer', 'legal_hold.manage'),
    -- system_administrator
    ('system_administrator', 'visit.roster.read_live'),
    ('system_administrator', 'site.configure'),
    ('system_administrator', 'device.provision'),
    ('system_administrator', 'role.assign'),
    ('system_administrator', 'membership.manage'),
    -- platform_support (Buffr Checkpoint internal role, never customer-side)
    ('platform_support', 'platform.support.break_glass'),
    ('platform_support', 'integration.configure'),
    ('platform_support', 'organisation.provision'),
    -- owner_operator: union of front_desk_operator + site_manager +
    -- compliance_audit_officer + system_administrator (Section 9.1a bundle)
    ('owner_operator', 'visit.roster.read_live'),
    ('owner_operator', 'visit.arrival.record'),
    ('owner_operator', 'visit.departure.record'),
    ('owner_operator', 'visit.access.approve'),
    ('owner_operator', 'site.configure'),
    ('owner_operator', 'device.provision'),
    ('owner_operator', 'visit.history.read'),
    ('owner_operator', 'audit_log.read'),
    ('owner_operator', 'evidence_pack.generate'),
    ('owner_operator', 'retention.configure'),
    ('owner_operator', 'visitor.data_request.manage'),
    ('owner_operator', 'legal_hold.manage'),
    ('owner_operator', 'role.assign'),
    ('owner_operator', 'membership.manage')
  ) AS grants(role_code, permission_code)
  JOIN permission_definitions p ON p.permission_code = grants.permission_code
  WHERE td.domain = 'role_code' AND td.code = grants.role_code;
