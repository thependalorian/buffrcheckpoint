-- Align plan feature copy with fixed role-catalogue messaging (marketing + public pricing API).
UPDATE subscription_catalog_item AS item
SET
  features_json = CASE td.code
    WHEN 'core' THEN
      '["Tablet and kiosk check-in","Assisted entry","Visitor records and sign-out","Offline capability","USSD and SMS channels","Owner-Operator from the fixed role catalogue"]'::jsonb
    WHEN 'professional' THEN
      '["Everything in Core","Multi-site dashboard","Host notification by email","Pre-registration via QR","NFC badge and phone check-in","Site-manager reporting","Granular roles from the fixed catalogue","Audit export"]'::jsonb
    ELSE item.features_json
  END
FROM type_definition AS td
WHERE item.item_code = td.id
  AND td.domain = 'subscription_plan'
  AND td.code IN ('core', 'professional')
  AND td.deleted_at IS NULL
  AND item.deleted_at IS NULL;
