-- Demo hosts for Buffr Analytics front-desk journey (§8.1 / §8.8).
-- Reception is the capture point; these hosts are who visitors come to see.
-- Names/contacts use LOCAL_DEV_STUB envelopes (base64 plaintext) so decrypt
-- works without the live AES key in SQL seeds.
-- Site: 74c72c99-93dc-4b33-934b-9b365e9924cf
-- Org:  47c8b69b-5d9c-499d-a759-debc33e87c5e
-- Safe to re-run (upsert by id).

INSERT INTO site_hosts (
  id, organisation_id, site_id,
  host_name_protected, department, host_contact_protected, active, deleted_at
) VALUES
(
  'd2bc3287-689b-436b-97d5-c84d0734c7ff',
  '47c8b69b-5d9c-499d-a759-debc33e87c5e',
  '74c72c99-93dc-4b33-934b-9b365e9924cf',
  '{"encryptionAlgorithm":"LOCAL_DEV_STUB","keyManagementReference":"local-dev-stub","keyVersion":1,"ciphertext":"UmVjZXB0aW9uIERlc2s="}'::jsonb,
  'Reception',
  '{"encryptionAlgorithm":"LOCAL_DEV_STUB","keyManagementReference":"local-dev-stub","keyVersion":1,"ciphertext":"cmVjZXB0aW9uQGJ1ZmZyY2hlY2twb2ludC50ZXN0"}'::jsonb,
  TRUE, NULL
),
(
  'a1111111-1111-4111-8111-111111111101',
  '47c8b69b-5d9c-499d-a759-debc33e87c5e',
  '74c72c99-93dc-4b33-934b-9b365e9924cf',
  '{"encryptionAlgorithm":"LOCAL_DEV_STUB","keyManagementReference":"local-dev-stub","keyVersion":1,"ciphertext":"VGhhbmRpIE5hbmdvbG8="}'::jsonb,
  'Finance',
  '{"encryptionAlgorithm":"LOCAL_DEV_STUB","keyManagementReference":"local-dev-stub","keyVersion":1,"ciphertext":"dGhhbmRpQGJ1ZmZyYW5hbHl0aWNzLmNvbQ=="}'::jsonb,
  TRUE, NULL
),
(
  'a1111111-1111-4111-8111-111111111102',
  '47c8b69b-5d9c-499d-a759-debc33e87c5e',
  '74c72c99-93dc-4b33-934b-9b365e9924cf',
  '{"encryptionAlgorithm":"LOCAL_DEV_STUB","keyManagementReference":"local-dev-stub","keyVersion":1,"ciphertext":"RGF2aWQgU2hpa29uZ28="}'::jsonb,
  'Engineering',
  '{"encryptionAlgorithm":"LOCAL_DEV_STUB","keyManagementReference":"local-dev-stub","keyVersion":1,"ciphertext":"ZGF2aWRAYnVmZnJhbmFseXRpY3MuY29t"}'::jsonb,
  TRUE, NULL
),
(
  'a1111111-1111-4111-8111-111111111103',
  '47c8b69b-5d9c-499d-a759-debc33e87c5e',
  '74c72c99-93dc-4b33-934b-9b365e9924cf',
  '{"encryptionAlgorithm":"LOCAL_DEV_STUB","keyManagementReference":"local-dev-stub","keyVersion":1,"ciphertext":"QW1hbGlhIFZyaWVz"}'::jsonb,
  'People',
  '{"encryptionAlgorithm":"LOCAL_DEV_STUB","keyManagementReference":"local-dev-stub","keyVersion":1,"ciphertext":"YW1hbGlhQGJ1ZmZyYW5hbHl0aWNzLmNvbQ=="}'::jsonb,
  TRUE, NULL
),
(
  'a1111111-1111-4111-8111-111111111104',
  '47c8b69b-5d9c-499d-a759-debc33e87c5e',
  '74c72c99-93dc-4b33-934b-9b365e9924cf',
  '{"encryptionAlgorithm":"LOCAL_DEV_STUB","keyManagementReference":"local-dev-stub","keyVersion":1,"ciphertext":"SVQgSGVscGRlc2s="}'::jsonb,
  'IT',
  '{"encryptionAlgorithm":"LOCAL_DEV_STUB","keyManagementReference":"local-dev-stub","keyVersion":1,"ciphertext":"aXRAYnVmZnJhbmFseXRpY3MuY29t"}'::jsonb,
  TRUE, NULL
)
ON CONFLICT (id) DO UPDATE SET
  host_name_protected = EXCLUDED.host_name_protected,
  department = EXCLUDED.department,
  host_contact_protected = EXCLUDED.host_contact_protected,
  active = TRUE,
  deleted_at = NULL;
