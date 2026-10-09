-- Receipt sent when an account-deletion request is accepted (standard DL-16): it says access has ended, what will be erased and what is
-- kept on purpose, and never claims everything is deleted. Ops-editable like every other template; additive and idempotent.

BEGIN;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('notification_template_code', 'account_deletion_accepted', 'Account deletion request accepted', 87)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code);

INSERT INTO platform_notification_template (id, template_code, channel_code, subject, body)
SELECT gen_random_uuid(), tc.id, ch.id, d.subject, d.body
FROM (VALUES
  (
    'account_deletion_accepted',
    'We received your request to close your Buffr Checkpoint account',
    'Your request to close your account has been accepted. Sign-in has ended for this account.' || chr(10) || chr(10) ||
    'Over the next steps we erase or anonymise the personal details tied to your account. We keep only the records we are required or justified to keep, such as billing records and audit events. Those records are restricted to the people who need them and are removed when their retention period ends.' || chr(10) || chr(10) ||
    'We will write to you again when the work is finished. If you did not ask for this, reply to this email straight away.'
  )
) AS d(code, subject, body)
JOIN type_definition tc ON tc.domain = 'notification_template_code' AND tc.code = d.code
JOIN type_definition ch ON ch.domain = 'notification_channel' AND ch.code = 'email'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_notification_template n WHERE n.template_code = tc.id AND n.channel_code = ch.id AND n.deleted_at IS NULL
);

COMMIT;
