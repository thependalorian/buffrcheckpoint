-- Marketing copy no longer names DigiNam or national e-ID (2026-09-29).
-- Replace the two identity lines on the Assure plan with one plain line.
-- The capability register and adapters are unchanged.

UPDATE subscription_catalog_item AS item
SET features_json = '[
  "Everything in Network",
  "Identity checks graded by site and visit risk",
  "High-risk visit policies",
  "Compliance dashboard and evidence packs"
]'::jsonb
FROM type_definition AS td
WHERE item.item_code = td.id
  AND td.domain = 'subscription_plan'
  AND td.code = 'assure'
  AND td.deleted_at IS NULL
  AND item.deleted_at IS NULL;
