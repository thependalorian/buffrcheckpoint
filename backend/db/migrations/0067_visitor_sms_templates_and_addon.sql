-- 0067: text messages to visitors, billed by use; WhatsApp and USSD retired.
--
-- Unlike email, which costs us nothing, every text message is bought from the provider (BulkSMS Namibia sells credits, one per message),
-- so SMS is an add-on that organisations pay for by use: N$1.00 per text sent, invoiced monthly (price is the setting sms_unit_price:default,
-- and sms_unit_price:<organisation id> for one organisation). This migration:
--   1. seeds the three visitor text templates (channel sms) in platform_notification_template, where ops edit the wording;
--   2. adds the "sms" add-on to the catalog (ops catalog only, like the other add-ons) with no monthly fee, because the charge is usage;
--   3. removes SMS and USSD from the plan feature lists that implied they came with a plan;
--   4. retires WhatsApp and USSD as channels (owner decision 2026-10-07: email and SMS are enough to reach a visitor with a phone).
-- Nothing sends until the organisation has the add-on, the provider arrangement is active and the capability is approved live.
--
-- Additive except step 4, which soft-deletes configuration rows only (no table is dropped, no operational row is touched).
-- Idempotent, one transaction. No triggers, no cascades, no CHECK lists.

BEGIN;

-- 1. Template codes and the sms-channel rows ---------------------------------------------------------------------------------------
INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('notification_template_code', 'visitor_visit_receipt_sms', 'Visitor: visit receipt by text', 91),
  ('notification_template_code', 'visitor_signout_thanks_sms', 'Visitor: sign-out thank you by text', 92),
  ('notification_template_code', 'visitor_prereg_invite_sms', 'Visitor: pre-registration invite by text', 93)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code);

INSERT INTO platform_notification_template (id, template_code, channel_code, subject, body)
SELECT gen_random_uuid(), tc.id, ch.id, NULL, d.body
FROM (VALUES
  (
    'visitor_visit_receipt_sms',
    '{{organisationName}}: visit recorded, ref {{visitReference}}. Sign out when you leave: {{signOutUrl}}'
  ),
  (
    'visitor_signout_thanks_sms',
    'Thank you for visiting {{organisationName}}. Rate your visit in one tap: {{ratingUrl}}'
  ),
  (
    'visitor_prereg_invite_sms',
    '{{organisationName}} has pre-registered you for {{visitDate}}. Check in on arrival: {{checkInUrl}}'
  )
) AS d(template_code, body)
JOIN type_definition tc ON tc.domain = 'notification_template_code' AND tc.code = d.template_code
JOIN type_definition ch ON ch.domain = 'notification_channel' AND ch.code = 'sms'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_notification_template t
  WHERE t.template_code = tc.id AND t.channel_code = ch.id AND t.deleted_at IS NULL
);

-- 2. The SMS add-on ---------------------------------------------------------------------------------------------------------------
INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'subscription_addon', 'sms', 'SMS messaging to visitors', 3
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = 'subscription_addon' AND code = 'sms' AND deleted_at IS NULL);

-- No monthly fee: the whole charge is usage (N$1.00 a text sent, billed by POST /platform/billing/sms-usage-invoices). Provider cost is
-- N$0.30 to N$0.50 a text, so each text earns N$0.50 to N$0.70. A monthly safety limit (default 1,000, setting sms_limit:default) stops a
-- runaway from sending thousands of billable texts.
INSERT INTO subscription_catalog_item (
  id, kind_code, item_code, tagline, monthly_amount, currency_code, annual_months_charged, features_json, is_featured, is_public, sort_order
)
SELECT
  gen_random_uuid(), kind.id, item.id,
  'Receipt and thank-you texts to visitors, billed only for the texts you send',
  0.00, 'NAD', 12,
  '["Check-in receipt with a one-tap sign-out link","Sign-out thank-you with a one-tap rating link","N$1.00 per text message sent, invoiced monthly","No monthly fee; no charge in a month with no texts","A monthly safety limit of 1,000 texts, raised on request"]'::jsonb,
  FALSE, FALSE, 3
FROM type_definition kind
JOIN type_definition item ON item.domain = 'subscription_addon' AND item.code = 'sms' AND item.deleted_at IS NULL
WHERE kind.domain = 'subscription_catalog_kind' AND kind.code = 'addon' AND kind.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM subscription_catalog_item c WHERE c.kind_code = kind.id AND c.item_code = item.id AND c.deleted_at IS NULL
  );

-- 3. Plans no longer imply SMS (or USSD) is included ------------------------------------------------------------------------------
UPDATE subscription_catalog_item
SET features_json = (
  SELECT jsonb_agg(
    CASE WHEN e = to_jsonb('Kiosk, SMS, and USSD entitlements when live'::text)
         THEN to_jsonb('Kiosk entitlements when live'::text) ELSE e END
    ORDER BY ord)
  FROM jsonb_array_elements(features_json) WITH ORDINALITY AS t(e, ord)
)
WHERE deleted_at IS NULL
  AND features_json @> '["Kiosk, SMS, and USSD entitlements when live"]'::jsonb;

-- 4. WhatsApp and USSD retired ----------------------------------------------------------------------------------------------------
-- Soft delete only: the rows stay so anything that ever pointed at them still resolves. The USSD capability row in
-- platform_capability_approvals keeps its history; the public capability list no longer reports it.
UPDATE type_definition
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND (
    (domain = 'notification_channel' AND code IN ('whatsapp', 'ussd'))
    OR (domain = 'capture_channel' AND code = 'ussd')
    OR (domain = 'identity_verification_provider' AND code = 'ussd')
    OR (domain = 'capability_code' AND code = 'ussd')
  );

COMMIT;
