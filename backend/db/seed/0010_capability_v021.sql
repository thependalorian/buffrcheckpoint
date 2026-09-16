-- v0.21 capability register expansion (idempotent)

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'capability_code', 'qr_invitation_checkin', 'QR Invitation Check-In', 5
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = 'capability_code' AND code = 'qr_invitation_checkin');

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'capability_code', 'sms_contact_confirmation', 'SMS Contact Confirmation', 6
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = 'capability_code' AND code = 'sms_contact_confirmation');

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'capability_status_value', 'provider_testing', 'Provider testing', 10
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = 'capability_status_value' AND code = 'provider_testing');

INSERT INTO platform_capability_approvals (id, capability_code, status_code, public_display_status, updated_at)
SELECT gen_random_uuid(), cc.id, sv.id, pv.id, now()
FROM (VALUES
  ('qr_invitation_checkin', 'live', 'live'),
  ('sms_contact_confirmation', 'not_started', 'not_available')
) AS seed(capability_code, status_value, public_value)
JOIN type_definition cc ON cc.domain = 'capability_code' AND cc.code = seed.capability_code
JOIN type_definition sv ON sv.domain = 'capability_status_value' AND sv.code = seed.status_value
JOIN type_definition pv ON pv.domain = 'public_capability_status_value' AND pv.code = seed.public_value
WHERE NOT EXISTS (
  SELECT 1 FROM platform_capability_approvals pca
  JOIN type_definition td ON td.id = pca.capability_code
  WHERE td.code = seed.capability_code
);
