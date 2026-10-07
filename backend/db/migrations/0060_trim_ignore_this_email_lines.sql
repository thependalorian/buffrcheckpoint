-- Drop the "ignore this email" sentences from the password reset and email verification templates. The change is logged with the
-- before and after text, like any template edit. password_changed and mfa_enabled keep their warnings: they report something that
-- already happened, so the reader needs to know what to do if it was not them.

BEGIN;

CREATE TEMP TABLE _trim (code TEXT, old_line TEXT) ON COMMIT DROP;
INSERT INTO _trim VALUES
  ('password_reset', 'If you did not request this, you can ignore this email. Your password will stay the same.'),
  ('email_verification', 'If you did not create this account, ignore this email.');

CREATE TEMP TABLE _before ON COMMIT DROP AS
SELECT n.id AS template_id, n.subject, n.body AS before_body, t.old_line
FROM platform_notification_template n
JOIN type_definition tc ON tc.id = n.template_code AND tc.domain = 'notification_template_code'
JOIN _trim t ON t.code = tc.code
WHERE n.deleted_at IS NULL AND position(t.old_line IN n.body) > 0;

UPDATE platform_notification_template n
SET body = btrim(replace(replace(b.before_body, chr(10) || chr(10) || b.old_line, ''), b.old_line, ''), chr(10) || ' '),
    updated_at = NOW()
FROM _before b
WHERE n.id = b.template_id;

INSERT INTO platform_notification_template_status_log (id, template_id, event_type_code, before_value, after_value, note)
SELECT gen_random_uuid(), b.template_id, ev.id,
       jsonb_build_object('subject', b.subject, 'body', b.before_body),
       jsonb_build_object('subject', n.subject, 'body', n.body),
       'removed the ignore-this-email sentence (migration 0060)'
FROM _before b
JOIN platform_notification_template n ON n.id = b.template_id
CROSS JOIN type_definition ev
WHERE ev.domain = 'platform_config_change_event_type' AND ev.code = 'updated';

COMMIT;
