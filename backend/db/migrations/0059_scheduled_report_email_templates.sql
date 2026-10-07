-- The three scheduled report emails ran from fallback text in code, with no editable template row. Seed them like every other
-- email: a type_definition code plus a platform_notification_template row that ops can edit, and the creation log row.
-- Variables: {{organisationName}}, {{from}}, {{to}}, {{period}}. The PDF is attached by the sender.

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('notification_template_code', 'scheduled_ops_daily_summary', 'Scheduled: ops daily summary', 70),
  ('notification_template_code', 'scheduled_site_manager_digest', 'Scheduled: weekly site digest', 71),
  ('notification_template_code', 'scheduled_board_compliance_monthly', 'Scheduled: monthly board and compliance pack', 72)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

INSERT INTO platform_notification_template (id, template_code, channel_code, subject, body)
SELECT gen_random_uuid(), tc.id, ch.id, d.subject, d.body
FROM (VALUES
  (
    'scheduled_ops_daily_summary',
    'Buffr Checkpoint daily summary, {{period}}',
    'Platform summary for {{period}}.' || chr(10) || chr(10) ||
    'It contains totals only, no visitor details.'
  ),
  (
    'scheduled_site_manager_digest',
    '{{organisationName}}: weekly site digest, {{from}} to {{to}}',
    'Your weekly site digest for {{organisationName}} is attached.' || chr(10) || chr(10) ||
    'It covers {{from}} to {{to}} and contains totals only, no visitor details.' || chr(10) || chr(10) ||
    'Change who receives this, or switch it off, under Settings > Scheduled reports in the admin dashboard.'
  ),
  (
    'scheduled_board_compliance_monthly',
    '{{organisationName}}: monthly board and compliance pack, {{period}}',
    'Your monthly board and compliance pack for {{organisationName}} is attached.' || chr(10) || chr(10) ||
    'It covers {{from}} to {{to}} and contains totals only, no visitor details.' || chr(10) || chr(10) ||
    'Change who receives this, or switch it off, under Settings > Scheduled reports in the admin dashboard.'
  )
) AS d(template_code, subject, body)
JOIN type_definition tc ON tc.domain = 'notification_template_code' AND tc.code = d.template_code
JOIN type_definition ch ON ch.domain = 'notification_channel' AND ch.code = 'email'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_notification_template t
  WHERE t.template_code = tc.id AND t.channel_code = ch.id AND t.deleted_at IS NULL
);

INSERT INTO platform_notification_template_status_log (id, template_id, event_type_code, after_value, note)
SELECT gen_random_uuid(), t.id, ev.id, jsonb_build_object('subject', t.subject, 'body', t.body), 'seeded from migration 0059'
FROM platform_notification_template t
CROSS JOIN type_definition ev
WHERE ev.domain = 'platform_config_change_event_type' AND ev.code = 'created'
  AND NOT EXISTS (
    SELECT 1 FROM platform_notification_template_status_log l WHERE l.template_id = t.id
  );
