-- ============================================================================
-- Buffr Checkpoint — subscription catalog (3 plans + priced add-ons).
--
-- Public packaging: Core / Professional / Verify subscriptions; Access and
-- Assurance are add-ons picked from one catalog, each with its own monthly
-- amount. Billing period monthly|annual (annual = 10× monthly charged).
--
-- Wiebe: type_definition for codes; priced catalog is config (platform-wide,
-- same tenancy exception as platform_configuration_setting); org attach
-- rows carry organisation_id; companion status log for add-on attachments.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. type_definition seeds
-- ---------------------------------------------------------------------------

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('subscription_catalog_kind', 'plan', 'Plan', 1),
  ('subscription_catalog_kind', 'addon', 'Add-on', 2),
  ('billing_period', 'monthly', 'Monthly', 1),
  ('billing_period', 'annual', 'Annual', 2),
  ('subscription_plan', 'core', 'Core', 1),
  ('subscription_plan', 'professional', 'Professional', 2),
  ('subscription_plan', 'verify', 'Verify', 3),
  ('subscription_addon', 'access', 'Physical access control', 1),
  ('subscription_addon', 'assurance', 'Controls review and evidence', 2),
  ('subscription_addon_status', 'active', 'Active', 1),
  ('subscription_addon_status', 'cancelled', 'Cancelled', 2)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition t
  WHERE t.domain = d.domain AND t.code = d.code AND t.deleted_at IS NULL
);

-- Retire legacy plan labels (keep rows for any FK references; soft-delete).
UPDATE type_definition
SET deleted_at = NOW()
WHERE domain = 'subscription_plan'
  AND code IN ('starter', 'growth', 'enterprise')
  AND deleted_at IS NULL;

-- Point existing subscriptions at the renamed plans.
UPDATE organisation_subscription s
SET plan_code = np.id
FROM type_definition op
JOIN type_definition np
  ON np.domain = 'subscription_plan'
 AND np.deleted_at IS NULL
 AND (
   (op.code = 'starter' AND np.code = 'core')
   OR (op.code = 'growth' AND np.code = 'professional')
   OR (op.code = 'enterprise' AND np.code = 'verify')
 )
WHERE s.plan_code = op.id
  AND op.domain = 'subscription_plan'
  AND op.code IN ('starter', 'growth', 'enterprise');

-- ---------------------------------------------------------------------------
-- 2. Catalog — one list; kind distinguishes plan vs add-on; each has its cost
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscription_catalog_item (
  id                    UUID PRIMARY KEY,
  kind_code             UUID NOT NULL REFERENCES type_definition (id),
  item_code             UUID NOT NULL REFERENCES type_definition (id),
  tagline               TEXT NOT NULL DEFAULT '',
  monthly_amount        NUMERIC(15,2) NOT NULL,
  currency_code         CHAR(3) NOT NULL DEFAULT 'NAD',
  -- Annual billing charges this many months of the monthly amount (10 = two free).
  annual_months_charged INT NOT NULL DEFAULT 10,
  features_json         JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_featured           BOOLEAN NOT NULL DEFAULT FALSE,
  is_public             BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            INT NOT NULL DEFAULT 0,
  deleted_at            TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_catalog_item_kind_code
  ON subscription_catalog_item (kind_code, item_code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_catalog_item_kind
  ON subscription_catalog_item (kind_code)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Subscription: billing period; add-on attachments
-- ---------------------------------------------------------------------------

ALTER TABLE organisation_subscription
  ADD COLUMN IF NOT EXISTS billing_period_code UUID NULL REFERENCES type_definition (id);

UPDATE organisation_subscription s
SET billing_period_code = bp.id
FROM type_definition bp
WHERE s.billing_period_code IS NULL
  AND bp.domain = 'billing_period'
  AND bp.code = 'monthly'
  AND bp.deleted_at IS NULL;

ALTER TABLE organisation_subscription
  ALTER COLUMN billing_period_code SET NOT NULL;

CREATE TABLE IF NOT EXISTS organisation_subscription_addon (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  subscription_id       UUID NOT NULL REFERENCES organisation_subscription (id),
  catalog_item_id       UUID NOT NULL REFERENCES subscription_catalog_item (id),
  -- Price snapshot at attach time (catalog may change later).
  monthly_amount        NUMERIC(15,2) NOT NULL,
  currency_code         CHAR(3) NOT NULL DEFAULT 'NAD',
  status_code           UUID NOT NULL REFERENCES type_definition (id),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_organisation_subscription_addon_org
  ON organisation_subscription_addon (organisation_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organisation_subscription_addon_sub
  ON organisation_subscription_addon (subscription_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organisation_subscription_addon_active
  ON organisation_subscription_addon (subscription_id, catalog_item_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS organisation_subscription_addon_status_log (
  id                    UUID PRIMARY KEY,
  subscription_addon_id UUID NOT NULL REFERENCES organisation_subscription_addon (id),
  from_status_code      UUID NULL REFERENCES type_definition (id),
  to_status_code        UUID NOT NULL REFERENCES type_definition (id),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id              UUID NULL,
  note                  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_organisation_subscription_addon_status_log_addon
  ON organisation_subscription_addon_status_log (subscription_addon_id, occurred_at);

-- ---------------------------------------------------------------------------
-- 4. Seed catalog (idempotent on kind+item)
-- ---------------------------------------------------------------------------

INSERT INTO subscription_catalog_item (
  id, kind_code, item_code, tagline, monthly_amount, currency_code,
  annual_months_charged, features_json, is_featured, is_public, sort_order
)
SELECT
  gen_random_uuid(),
  kind.id,
  item.id,
  d.tagline,
  d.monthly_amount::numeric(15,2),
  'NAD',
  10,
  d.features_json::jsonb,
  d.is_featured,
  d.is_public,
  d.sort_order
FROM (VALUES
  (
    'plan', 'core',
    'Single-site SME or office',
    '1200.00',
    '["Tablet and kiosk check-in","Assisted entry","Visitor records and sign-out","Offline capability","USSD and SMS channels","Owner-Operator role"]',
    FALSE,
    TRUE,
    1
  ),
  (
    'plan', 'professional',
    'Banks, clinics, corporate networks',
    '3500.00',
    '["Everything in Core","Multi-site dashboard","Host notification by email","Pre-registration via QR","NFC badge and phone check-in","Site-manager reporting","Audit export"]',
    TRUE,
    TRUE,
    2
  ),
  (
    'plan', 'verify',
    'Government and regulated institutions',
    '7000.00',
    '["Everything in Professional","DigiNam verification where enabled","Graduated identity assurance from self-asserted identity through official e-ID validation","High-risk visit policies","Compliance dashboard"]',
    FALSE,
    TRUE,
    3
  ),
  (
    'addon', 'access',
    'Zones, credentials, and escorted entry for high-security sites',
    '5000.00',
    '["Physical access-control integration","Contractor credential lifecycle","Zone and escort rules","Emergency roster"]',
    FALSE,
    FALSE,
    1
  ),
  (
    'addon', 'assurance',
    'Recurring evidence for boards, auditors, and regulators',
    '4500.00',
    '["Annual controls review","Retention and RBAC review","Recovery test","Board-ready evidence pack"]',
    FALSE,
    FALSE,
    2
  )
) AS d(kind, item, tagline, monthly_amount, features_json, is_featured, is_public, sort_order)
JOIN type_definition kind
  ON kind.domain = 'subscription_catalog_kind' AND kind.code = d.kind AND kind.deleted_at IS NULL
JOIN type_definition item
  ON item.domain = CASE WHEN d.kind = 'plan' THEN 'subscription_plan' ELSE 'subscription_addon' END
 AND item.code = d.item
 AND item.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM subscription_catalog_item c
  WHERE c.kind_code = kind.id
    AND c.item_code = item.id
    AND c.deleted_at IS NULL
);
