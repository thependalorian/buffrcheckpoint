-- Closure notice sent when an account-deletion request is completed. It says what was erased and that some records are kept on purpose,
-- and never claims everything is deleted. Ops-editable like every other template; additive and idempotent.

BEGIN;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('notification_template_code', 'account_deletion_completed', 'Account closed after a deletion request', 86)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code);

INSERT INTO platform_notification_template (id, template_code, channel_code, subject, body)
SELECT gen_random_uuid(), tc.id, ch.id, d.subject, d.body
FROM (VALUES
  (
    'account_deletion_completed',
    'Your Buffr Checkpoint account has been closed',
    'Your account has been closed and the personal details tied to it have been erased or anonymised.' || chr(10) || chr(10) ||
    'We keep only the records we are required or justified to keep, such as billing records and audit events. Those records are restricted to the people who need them and are removed when their retention period ends.' || chr(10) || chr(10) ||
    'If you did not ask for this, reply to this email straight away.'
  )
) AS d(code, subject, body)
JOIN type_definition tc ON tc.domain = 'notification_template_code' AND tc.code = d.code
JOIN type_definition ch ON ch.domain = 'notification_channel' AND ch.code = 'email'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_notification_template n WHERE n.template_code = tc.id AND n.channel_code = ch.id AND n.deleted_at IS NULL
);

COMMIT;
