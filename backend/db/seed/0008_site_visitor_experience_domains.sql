-- Buffr Checkpoint — type_definition seed for migration 0010
-- Source of truth: buffrcheckpoint.md Section 11.9.8
-- Applied to Neon project bold-cloud-47505421 via MCP on 2026-09-11.
-- Adding a new value later is one INSERT, never a migration.

INSERT INTO type_definition (domain, code, label, sort_order) VALUES
  -- configuration_version_status (branding / kiosk experience / escalation version lifecycle)
  ('configuration_version_status', 'draft', 'Draft', 1),
  ('configuration_version_status', 'published', 'Published', 2),
  ('configuration_version_status', 'retired', 'Retired', 3),

  -- site_qr_type (Section 11.9.8.1 — narrowly scoped site QR purposes)
  ('site_qr_type', 'public_site_checkin', 'Public site check-in', 1),
  ('site_qr_type', 'pre_registration', 'Pre-registration invitation', 2),
  ('site_qr_type', 'sign_out', 'Visitor sign-out', 3),
  ('site_qr_type', 'emergency_info', 'Emergency information', 4),
  ('site_qr_type', 'contractor_induction', 'Contractor induction', 5),
  ('site_qr_type', 'device_support', 'Device support / technician', 6),

  -- host_notification_escalation_action (Section 11.9.8.4)
  ('host_notification_escalation_action', 'auto_admit_low_risk', 'Auto-admit low-risk visitor', 1),
  ('host_notification_escalation_action', 'notify_reception', 'Notify reception', 2),
  ('host_notification_escalation_action', 'notify_alternate_host', 'Notify alternate host', 3),
  ('host_notification_escalation_action', 'notify_site_manager', 'Notify site manager', 4),
  ('host_notification_escalation_action', 'hold_entry', 'Hold entry pending approval', 5)
ON CONFLICT DO NOTHING;
