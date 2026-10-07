-- Personal data breach notice to customers (draft Data Protection Bill s22(3) and s22(4)). Checkpoint is the processor: when it becomes
-- aware of a breach affecting a customer's personal data it must tell that customer, the controller, without undue delay, with the nature of
-- the breach, the categories and approximate number of people, the likely consequences and the measures taken or proposed. The customer
-- needs this to meet its own 72-hour deadline to the authority. The template is ops-editable like every other; additive and idempotent.

BEGIN;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('notification_template_code', 'customer_breach_notice', 'Customer: personal data breach notice', 85)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code);

INSERT INTO platform_notification_template (id, template_code, channel_code, subject, body)
SELECT gen_random_uuid(), tc.id, ch.id, d.subject, d.body
FROM (VALUES
  (
    'customer_breach_notice',
    'Important: personal data incident affecting {{organisationName}}',
    'We are writing to tell you about an incident that affects personal data held for {{organisationName}} in Buffr Checkpoint.' || chr(10) || chr(10) ||
    'What happened: {{whatHappened}}' || chr(10) ||
    'When we became aware: {{whenDiscovered}}' || chr(10) ||
    'Information involved: {{dataAffected}}' || chr(10) ||
    'People affected (approximate): {{peopleAffected}}' || chr(10) ||
    'Likely consequences: {{consequences}}' || chr(10) ||
    'What we have done and what we are doing: {{measures}}' || chr(10) || chr(10) ||
    'As the organisation responsible for this information you may have to notify the data protection authority, and the people affected, within a set time. We will give you everything you need and keep you updated. Reply to this email and we will respond straight away.'
  )
) AS d(code, subject, body)
JOIN type_definition tc ON tc.domain = 'notification_template_code' AND tc.code = d.code
JOIN type_definition ch ON ch.domain = 'notification_channel' AND ch.code = 'email'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_notification_template n WHERE n.template_code = tc.id AND n.channel_code = ch.id AND n.deleted_at IS NULL
);

COMMIT;
