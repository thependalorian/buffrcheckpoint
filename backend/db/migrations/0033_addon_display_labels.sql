-- Rename add-on display labels: not peer products ("Access" / "Assurance"),
-- just descriptive add-on names in the single catalog.
UPDATE type_definition
SET label = 'Physical access control'
WHERE domain = 'subscription_addon' AND code = 'access' AND deleted_at IS NULL;

UPDATE type_definition
SET label = 'Controls review and evidence'
WHERE domain = 'subscription_addon' AND code = 'assurance' AND deleted_at IS NULL;

UPDATE subscription_catalog_item c
SET tagline = 'Zones, credentials, and escorted entry for high-security sites'
FROM type_definition t
WHERE c.item_code = t.id
  AND t.domain = 'subscription_addon'
  AND t.code = 'access'
  AND c.deleted_at IS NULL;

UPDATE subscription_catalog_item c
SET tagline = 'Recurring evidence for boards, auditors, and regulators'
FROM type_definition t
WHERE c.item_code = t.id
  AND t.domain = 'subscription_addon'
  AND t.code = 'assurance'
  AND c.deleted_at IS NULL;

-- Keep add-ons in the ops catalog only — not on public marketing pricing.
UPDATE subscription_catalog_item c
SET is_public = FALSE
FROM type_definition kind
WHERE c.kind_code = kind.id
  AND kind.domain = 'subscription_catalog_kind'
  AND kind.code = 'addon'
  AND c.deleted_at IS NULL;
