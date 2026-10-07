-- 0066: register BulkSMS Namibia as an SMS provider arrangement, switched OFF.
--
-- The row only makes the provider selectable. Nothing sends until the owner (1) sets BULK_SMS_API_KEY on the API, (2) sets this row
-- active, and (3) the smsContactConfirmation capability is approved live in the ops console (dual approval, with evidence). Until then
-- the SMS channel keeps answering provider_not_live, exactly as before.
--
-- Additive, idempotent. No triggers, no cascades.

INSERT INTO telecommunications_provider_arrangements (id, provider_code, display_name, active)
SELECT gen_random_uuid(), 'bulksmsnam', 'BulkSMS Namibia', false
WHERE NOT EXISTS (
  SELECT 1 FROM telecommunications_provider_arrangements WHERE provider_code = 'bulksmsnam'
);
