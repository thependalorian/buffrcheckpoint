-- ============================================================================
-- Buffr Checkpoint — rename plans to Site / Network / Assure and price per site.
--
-- Plans: core -> site, professional -> network, verify -> assure (codes and
-- labels). Old plan codes are soft-deleted after every catalog row and
-- subscription is repointed (same pattern as 0032).
--
-- Per-site pricing: each plan row carries included_sites and an optional
-- extra_site_monthly_amount (NULL = the plan cannot license extra sites).
-- Each subscription carries a licensed site_quantity. Quantity changes are
-- recorded in an immutable companion log. MRR is computed in application
-- code (billing.service.ts). Zero triggers, zero cascades.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. New plan codes
-- ---------------------------------------------------------------------------

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('subscription_plan', 'site', 'Site', 1),
  ('subscription_plan', 'network', 'Network', 2),
  ('subscription_plan', 'assure', 'Assure', 3)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition t
  WHERE t.domain = d.domain AND t.code = d.code AND t.deleted_at IS NULL
);

-- Repoint catalog rows and subscriptions from the old codes to the new ones.
UPDATE subscription_catalog_item item
SET item_code = np.id
FROM type_definition op
JOIN type_definition np
  ON np.domain = 'subscription_plan'
 AND np.deleted_at IS NULL
 AND (
   (op.code = 'core' AND np.code = 'site')
   OR (op.code = 'professional' AND np.code = 'network')
   OR (op.code = 'verify' AND np.code = 'assure')
 )
WHERE item.item_code = op.id
  AND op.domain = 'subscription_plan'
  AND op.code IN ('core', 'professional', 'verify');

UPDATE organisation_subscription s
SET plan_code = np.id
FROM type_definition op
JOIN type_definition np
  ON np.domain = 'subscription_plan'
 AND np.deleted_at IS NULL
 AND (
   (op.code = 'core' AND np.code = 'site')
   OR (op.code = 'professional' AND np.code = 'network')
   OR (op.code = 'verify' AND np.code = 'assure')
 )
WHERE s.plan_code = op.id
  AND op.domain = 'subscription_plan'
  AND op.code IN ('core', 'professional', 'verify');

-- Retire the old codes (rows kept for FK history; soft-delete only).
UPDATE type_definition
SET deleted_at = NOW()
WHERE domain = 'subscription_plan'
  AND code IN ('core', 'professional', 'verify')
  AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Per-site pricing columns
-- ---------------------------------------------------------------------------

ALTER TABLE subscription_catalog_item
  ADD COLUMN IF NOT EXISTS included_sites INT NOT NULL DEFAULT 1;

ALTER TABLE subscription_catalog_item
  ADD COLUMN IF NOT EXISTS extra_site_monthly_amount NUMERIC(15,2) NULL;

-- Licensed sites on the subscription (billing seat count, not a live count).
ALTER TABLE organisation_subscription
  ADD COLUMN IF NOT EXISTS site_quantity INT NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------------
-- 3. Immutable log of licensed-site changes (companion to the subscription)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organisation_subscription_site_quantity_log (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  subscription_id  UUID NOT NULL REFERENCES organisation_subscription (id),
  from_quantity    INT NULL,
  to_quantity      INT NOT NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id         UUID NULL,
  note             TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_org_subscription_site_quantity_log_org_sub
  ON organisation_subscription_site_quantity_log (organisation_id, subscription_id, occurred_at);

-- ---------------------------------------------------------------------------
-- 4. Catalog prices, site allowances, and copy
-- ---------------------------------------------------------------------------

UPDATE subscription_catalog_item AS item
SET
  monthly_amount = CASE td.code WHEN 'site' THEN 1500.00 WHEN 'network' THEN 4500.00 WHEN 'assure' THEN 9500.00 END,
  included_sites = CASE td.code WHEN 'site' THEN 1 ELSE 3 END,
  extra_site_monthly_amount = CASE td.code WHEN 'site' THEN NULL WHEN 'network' THEN 950.00 WHEN 'assure' THEN 1500.00 END,
  tagline = CASE td.code
    WHEN 'site' THEN 'One office, branch, or clinic'
    WHEN 'network' THEN 'Branch networks, clinic groups, corporate offices'
    WHEN 'assure' THEN 'Government and regulated institutions'
  END,
  is_featured = (td.code = 'network'),
  features_json = CASE td.code
    WHEN 'site' THEN
      '[
        "Unlimited visits",
        "Public site QR and phone web check-in",
        "Assisted front-desk entry",
        "Visitor records and sign-out",
        "Reports and encrypted visitor record",
        "Owner-Operator from the fixed role catalogue",
        "Tablet not required"
      ]'::jsonb
    WHEN 'network' THEN
      '[
        "Everything in Site",
        "Multi-site dashboard",
        "Host notification by email",
        "Pre-registration via QR",
        "NFC badge and phone check-in when enabled",
        "Kiosk, SMS, and USSD entitlements when live",
        "Site-manager reporting",
        "Granular roles from the fixed catalogue",
        "Audit export"
      ]'::jsonb
    WHEN 'assure' THEN
      '[
        "Everything in Network",
        "DigiNam verification where enabled",
        "Graduated identity assurance from self-asserted identity through official e-ID validation",
        "High-risk visit policies",
        "Compliance dashboard and evidence packs"
      ]'::jsonb
  END
FROM type_definition AS td
WHERE item.item_code = td.id
  AND td.domain = 'subscription_plan'
  AND td.code IN ('site', 'network', 'assure')
  AND td.deleted_at IS NULL
  AND item.deleted_at IS NULL;
