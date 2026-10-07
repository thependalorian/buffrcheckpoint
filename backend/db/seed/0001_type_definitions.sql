-- Buffr Checkpoint — type_definition seed data
-- Source of truth: docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md Section 11.4.5's
-- domain list. type_definition is the one admin-seeded config table
-- exception (Wiebe rule 1) — id uses the server-side default.
-- Adding a new value later is one more INSERT, never a migration.

INSERT INTO type_definition (domain, code, label, sort_order) VALUES
  -- visit_status (Section 8, visit lifecycle)
  ('visit_status', 'pending_sync', 'Pending sync', 1),
  ('visit_status', 'checked_in', 'Checked in', 2),
  ('visit_status', 'checked_out', 'Checked out', 3),
  ('visit_status', 'synced_ack', 'Synced (acknowledged)', 4),
  ('visit_status', 'pending_approval', 'Pending host approval', 5),
  ('visit_status', 'admitted', 'Admitted', 6),
  ('visit_status', 'entry_rejected', 'Entry rejected', 7),

  -- identity_assurance_level (Section 5.2 / 5.2a — codes V0–V4; labels = canonical names)
  ('identity_assurance_level', 'V0', 'Self-asserted identity', 1),
  ('identity_assurance_level', 'V1', 'Contact-channel possession', 2),
  ('identity_assurance_level', 'V2', 'Site-issued credential possession', 3),
  ('identity_assurance_level', 'V3', 'DigiNam / NPKI verified identity', 4),
  ('identity_assurance_level', 'V4', 'Official e-ID cryptographic validation', 5),

  -- risk_tier (Section 7.2)
  ('risk_tier', 'tier_1_open', 'Open / low risk', 1),
  ('risk_tier', 'tier_2_standard', 'Standard controlled', 2),
  ('risk_tier', 'tier_3_sensitive', 'Sensitive', 3),
  ('risk_tier', 'tier_4_restricted', 'Restricted', 4),
  ('risk_tier', 'tier_5_critical', 'Critical / exceptional', 5),

  -- role_code (Section 9.1, Section 9.1a)
  ('role_code', 'visitor', 'Visitor', 1),
  ('role_code', 'host_staff', 'Host / Staff', 2),
  ('role_code', 'front_desk_operator', 'Front Desk Operator', 3),
  ('role_code', 'site_manager', 'Site Manager', 4),
  ('role_code', 'regional_manager', 'Regional Manager', 5),
  ('role_code', 'compliance_audit_officer', 'Compliance / Audit Officer', 6),
  ('role_code', 'system_administrator', 'System Administrator', 7),
  ('role_code', 'platform_support', 'Platform Support', 8),
  ('role_code', 'diginam_verification_adapter', 'DigiNam Verification Adapter', 9),
  ('role_code', 'owner_operator', 'Owner-Operator', 10),

  -- credential_type / credential_holder_type (Section 12)
  ('credential_type', 'nfc_badge', 'NFC badge', 1),
  ('credential_type', 'nfc_phone', 'NFC phone credential', 2),
  ('credential_type', 'printed_badge', 'Printed badge', 3),
  ('credential_type', 'diginam_reference', 'DigiNam reference', 4),
  ('credential_holder_type', 'visitor', 'Visitor', 1),
  ('credential_holder_type', 'contractor', 'Contractor', 2),
  ('credential_holder_type', 'staff', 'Staff', 3),

  -- role_assignment_event_type (Section 9.2 rule 7 / 9.1a)
  ('role_assignment_event_type', 'initial', 'Initial assignment', 1),
  ('role_assignment_event_type', 'change', 'Role change', 2),

  -- cran_compliance_status (Addendum Section 2.2 / Section 14.3a, v0.4):
  -- the deployability lifecycle, not a coarse approved/exempt/non-compliant
  -- set — "no unregistered device should be deployable" is only enforceable
  -- against a specific gate value (approved_for_deployment), and the prior
  -- 4-value set here had no code path checking it, so it's replaced rather
  -- than extended (no device rows or code reference these values yet).
  ('cran_compliance_status', 'unassessed', 'Unassessed', 1),
  ('cran_compliance_status', 'supplier_evidence_received', 'Supplier evidence received', 2),
  ('cran_compliance_status', 'exemption_assessed', 'Exemption assessed', 3),
  ('cran_compliance_status', 'cran_certificate_confirmed', 'CRAN certificate confirmed', 4),
  ('cran_compliance_status', 'mdm_enrolled', 'MDM enrolled', 5),
  ('cran_compliance_status', 'approved_for_deployment', 'Approved for deployment', 6),
  ('cran_compliance_status', 'retired', 'Retired', 7),

  -- notification_channel / notification_delivery_status (Section 11.2)
  ('notification_channel', 'email', 'Email', 1),
  ('notification_channel', 'sms', 'SMS', 2),
  ('notification_delivery_status', 'sent', 'Sent', 1),
  ('notification_delivery_status', 'delivered', 'Delivered', 2),
  ('notification_delivery_status', 'failed', 'Failed', 3),

  -- dsar_request_type (Section 8.9, Section 11.4.4 account deletion)
  ('dsar_request_type', 'data_export', 'Data export', 1),
  ('dsar_request_type', 'correction', 'Correction', 2),
  ('dsar_request_type', 'account_deletion', 'Account deletion', 3),

  -- audit_event_type (Section 9.2 rule 3)
  ('audit_event_type', 'read', 'Sensitive read', 1),
  ('audit_event_type', 'export', 'Export', 2),
  ('audit_event_type', 'correction', 'Correction', 3),
  ('audit_event_type', 'deletion', 'Deletion', 4),

  -- capture_channel (Section 5.1)
  ('capture_channel', 'kiosk', 'Kiosk / manual', 1),
  ('capture_channel', 'assisted', 'Assisted front-desk', 2),
  ('capture_channel', 'nfc_badge', 'NFC badge', 3),
  ('capture_channel', 'nfc_phone', 'NFC phone', 4),
  ('capture_channel', 'qr', 'QR pre-registration', 5),
  ('capture_channel', 'sms', 'SMS', 7),
  ('capture_channel', 'diginam', 'DigiNam credential', 8),

  -- visitor_type (Part Three Section 4)
  ('visitor_type', 'general', 'General visitor', 1),
  ('visitor_type', 'pre_registered', 'Pre-registered visitor', 2),
  ('visitor_type', 'contractor', 'Contractor', 3),
  ('visitor_type', 'delivery', 'Delivery driver', 4),
  ('visitor_type', 'interview', 'Interview candidate', 5),
  ('visitor_type', 'government_vip', 'Government official / VIP', 6),
  ('visitor_type', 'healthcare', 'Healthcare visitor', 7),
  ('visitor_type', 'event_attendee', 'Event attendee', 8),
  ('visitor_type', 'temporary_staff', 'Temporary staff', 9),
  ('visitor_type', 'restricted_site', 'Restricted-site visitor', 10),

  -- language (Section 1a.3 Vizito gap assessment, P1)
  ('language', 'en', 'English', 1),
  ('language', 'af', 'Afrikaans', 2),
  ('language', 'oshiwambo', 'Oshiwambo', 3),
  ('language', 'otjiherero', 'Otjiherero', 4),
  ('language', 'khoekhoegowab', 'Khoekhoegowab', 5),
  ('language', 'rukwangali', 'Rukwangali', 6),
  ('language', 'silozi', 'Silozi', 7),

  -- organisation_sector (Addendum Section 7.1 "Public-Sector Tenant Policy").
  -- Config over code (Wiebe rule 1): a sector missing from this list is a
  -- seed INSERT, never a hardcoded frontend enum. The list is deliberately
  -- short and flat (13 sectors and Other): one code per organisation, no
  -- groups, so analytics count by the stored code. Consolidated from 20 in
  -- migration 0065_organisation_sector_consolidation.sql.
  ('organisation_sector', 'sme', 'Corporate office or professional services', 1),
  ('organisation_sector', 'government', 'Government and public administration', 2),
  ('organisation_sector', 'financial_services', 'Banking, finance and insurance', 3),
  ('organisation_sector', 'healthcare', 'Healthcare', 4),
  ('organisation_sector', 'education', 'Education and training', 5),
  ('organisation_sector', 'energy_utilities', 'Energy, mining and utilities', 6),
  ('organisation_sector', 'transport_logistics', 'Transport and logistics', 7),
  ('organisation_sector', 'technology_telecom', 'Technology and telecommunications', 8),
  ('organisation_sector', 'hospitality_tourism', 'Hospitality, tourism and entertainment', 9),
  ('organisation_sector', 'retail_trade', 'Retail and wholesale', 10),
  ('organisation_sector', 'manufacturing', 'Manufacturing, construction and agriculture', 11),
  ('organisation_sector', 'ngo_nonprofit', 'Non-profit and community organisations', 12),
  ('organisation_sector', 'religious_faith_based', 'Faith-based organisations', 13),
  ('organisation_sector', 'other', 'Other', 99),

  -- invitation_status (Section 11.4.5 invitations.ts)
  ('invitation_status', 'pending', 'Pending', 1),
  ('invitation_status', 'matched', 'Matched to visit', 2),
  ('invitation_status', 'expired', 'Expired', 3),
  ('invitation_status', 'cancelled', 'Cancelled', 4),

  -- evidence_pack_status (Section 11.4.5 evidence.ts)
  ('evidence_pack_status', 'pending', 'Pending', 1),
  ('evidence_pack_status', 'generating', 'Generating', 2),
  ('evidence_pack_status', 'ready', 'Ready', 3),
  ('evidence_pack_status', 'failed', 'Failed', 4),

  -- support_access_reason (Section 9.2 rule 4 break-glass)
  ('support_access_reason', 'incident_response', 'Incident response', 1),
  ('support_access_reason', 'customer_request', 'Customer request', 2),
  ('support_access_reason', 'maintenance', 'Maintenance', 3),

  -- dsar_status (Section 8.9 data lifecycle journey — request review status,
  -- distinct from dsar_request_type above)
  ('dsar_status', 'pending', 'Pending', 1),
  ('dsar_status', 'in_review', 'In review', 2),
  ('dsar_status', 'completed', 'Completed', 3),
  ('dsar_status', 'rejected', 'Rejected', 4),

  -- credential_status (Section 12.3 revocation/expiry control)
  ('credential_status', 'active', 'Active', 1),
  ('credential_status', 'revoked', 'Revoked', 2),
  ('credential_status', 'expired', 'Expired', 3),

  -- device_status (Addendum Section 2.2 device compliance register lifecycle)
  ('device_status', 'operational', 'Operational', 1),
  ('device_status', 'maintenance', 'Under maintenance', 2),
  ('device_status', 'retired', 'Retired', 3),

  -- legal_hold_status (Section 8.9 legal hold lifecycle)
  ('legal_hold_status', 'active', 'Active', 1),
  ('legal_hold_status', 'released', 'Released', 2),

  -- emergency_status (Section 8.6 emergency/evacuation journey)
  ('emergency_status', 'active', 'Active', 1),
  ('emergency_status', 'resolved', 'Resolved', 2),

  -- identity_verification_provider (Section 5.1 channel strategy)
  ('identity_verification_provider', 'self_declared', 'Self-declared', 1),
  ('identity_verification_provider', 'sms_otp', 'SMS OTP', 2),
  ('identity_verification_provider', 'nfc_badge', 'NFC badge', 4),
  ('identity_verification_provider', 'nfc_phone', 'NFC phone', 5),
  ('identity_verification_provider', 'diginam', 'DigiNam/NPKI', 6),
  ('identity_verification_provider', 'national_eid', 'National e-ID smart card', 7),

  -- purpose_category (Section 5.1 architecture data model "Purpose category")
  ('purpose_category', 'business', 'Business', 1),
  ('purpose_category', 'personal', 'Personal', 2),
  ('purpose_category', 'delivery', 'Delivery', 3),
  ('purpose_category', 'interview', 'Interview', 4),
  ('purpose_category', 'government', 'Government', 5),
  ('purpose_category', 'medical', 'Medical', 6),
  ('purpose_category', 'maintenance', 'Maintenance / contractor work', 7),
  ('purpose_category', 'event', 'Event', 8),
  ('purpose_category', 'meeting', 'Meeting', 9),
  ('purpose_category', 'vehicle', 'Vehicle / parking', 10),
  ('purpose_category', 'other', 'Other', 11)
ON CONFLICT DO NOTHING;
