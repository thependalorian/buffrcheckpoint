-- Align Core / Professional catalog feature strings with QR-first packaging
-- (public site QR + assisted on Core; no live USSD/SMS on Core; NFC/kiosk as
-- Professional entitlements). Follow-up to 0032_subscription_catalog.sql.
-- Join item_code via subscription_plan domain (same as 0032 seed), not a
-- nonexistent subscription_catalog_item_code domain.

UPDATE subscription_catalog_item AS item
SET features_json = CASE td.code
  WHEN 'core' THEN
    '[
      "Public site QR and phone web check-in",
      "Assisted front-desk entry",
      "Visitor records and sign-out",
      "Reports and encrypted visitor record",
      "Owner-Operator from the fixed role catalogue",
      "Tablet not required"
    ]'::jsonb
  WHEN 'professional' THEN
    '[
      "Everything in Core",
      "Multi-site dashboard",
      "Host notification by email",
      "Pre-registration via QR",
      "NFC badge and phone check-in when enabled",
      "Kiosk, SMS, and USSD entitlements when live",
      "Site-manager reporting",
      "Granular roles from the fixed catalogue",
      "Audit export"
    ]'::jsonb
  WHEN 'verify' THEN
    '[
      "Everything in Professional",
      "DigiNam verification where enabled",
      "Graduated identity assurance from self-asserted identity through official e-ID validation",
      "High-risk visit policies",
      "Compliance dashboard"
    ]'::jsonb
  ELSE item.features_json
  END
FROM type_definition AS td
WHERE item.item_code = td.id
  AND td.domain = 'subscription_plan'
  AND td.code IN ('core', 'professional', 'verify')
  AND td.deleted_at IS NULL
  AND item.deleted_at IS NULL;
