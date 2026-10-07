-- The support-ticket acknowledgement went out broken: the sender has no name for "Hi {{name}}," (it printed "Hi ,") and passes the
-- reference as {{ticketId}} — the same token support_ticket_reply uses — while this row asked for {{ticketReference}}, so the
-- reader saw the literal token. Rewrite the row to match what the code can actually pass, logged like any template edit.

BEGIN;

CREATE TEMP TABLE _ack_new (code TEXT, new_subject TEXT, new_body TEXT) ON COMMIT DROP;
INSERT INTO _ack_new VALUES
  (
    'support_ticket_ack',
    'We received your support request',
    'We received your support request.' || chr(10) || chr(10) ||
    'Subject: {{subject}}' || chr(10) ||
    'Reference: {{ticketId}}' || chr(10) || chr(10) ||
    'Our team will reply by email and in the Support section of your dashboard. Reply to this email to add details.'
  );

CREATE TEMP TABLE _ack_before ON COMMIT DROP AS
SELECT n.id AS template_id, n.subject AS old_subject, n.body AS old_body, u.new_subject, u.new_body
FROM platform_notification_template n
JOIN type_definition tc ON tc.id = n.template_code AND tc.domain = 'notification_template_code'
JOIN _ack_new u ON u.code = tc.code
WHERE n.deleted_at IS NULL
  AND (n.subject IS DISTINCT FROM u.new_subject OR n.body IS DISTINCT FROM u.new_body);

UPDATE platform_notification_template n
SET subject = b.new_subject,
    body = b.new_body,
    updated_at = NOW()
FROM _ack_before b
WHERE n.id = b.template_id;

INSERT INTO platform_notification_template_status_log (id, template_id, event_type_code, before_value, after_value, note)
SELECT gen_random_uuid(), b.template_id, ev.id,
       jsonb_build_object('subject', b.old_subject, 'body', b.old_body),
       jsonb_build_object('subject', b.new_subject, 'body', b.new_body),
       'aligned the row with the sender variables (migration 0064)'
FROM _ack_before b
CROSS JOIN type_definition ev
WHERE ev.domain = 'platform_config_change_event_type' AND ev.code = 'updated';

COMMIT;
