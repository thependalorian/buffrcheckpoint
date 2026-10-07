-- Visitor-facing email and credit notes become real emails.
--   visitor_prereg_invite   sent when a host pre-registers a visitor with an email address (was dormant)
--   visitor_visit_receipt   sent at check-in, only when the visitor typed an email address
--   visitor_signout_thanks  sent at check-out, only when the visitor typed an email address
--   credit_note_issued      sent when billing staff issue a credit note (was dormant)
--   support_ticket_reply    sent to the requester when platform staff reply on a ticket
-- The first three can be switched off per organisation (notification_preferences:<organisation id> in platform_configuration_setting).
-- Every change is logged with before and after text.

BEGIN;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('notification_template_code', 'visitor_visit_receipt', 'Visitor: visit receipt', 82),
  ('notification_template_code', 'visitor_signout_thanks', 'Visitor: sign-out thank you', 83),
  ('notification_template_code', 'support_ticket_reply', 'Support: reply from our team', 84)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code);

INSERT INTO platform_notification_template (id, template_code, channel_code, subject, body)
SELECT gen_random_uuid(), tc.id, ch.id, d.subject, d.body
FROM (VALUES
  (
    'visitor_visit_receipt',
    'Your visit to {{siteName}}',
    'Thank you for checking in.' || chr(10) || chr(10) ||
    'Site: {{siteName}}' || chr(10) ||
    'Visiting: {{hostName}}' || chr(10) ||
    'Checked in: {{checkedInAt}}' || chr(10) ||
    'Reference: {{visitReference}}' || chr(10) || chr(10) ||
    'When you leave, sign out here:' || chr(10) ||
    '{{signOutUrl}}' || chr(10) || chr(10) ||
    'You are receiving this because you gave this address when you checked in. It is not used for anything else.'
  ),
  (
    'visitor_signout_thanks',
    'Thank you for visiting {{siteName}}',
    'Thank you for visiting {{siteName}}.' || chr(10) || chr(10) ||
    'Checked in: {{checkedInAt}}' || chr(10) ||
    'Checked out: {{checkedOutAt}}' || chr(10) ||
    'Time on site: {{duration}}' || chr(10) || chr(10) ||
    'How was your visit? Rate it in one tap:' || chr(10) ||
    '{{ratingUrl}}' || chr(10) || chr(10) ||
    'You are receiving this because you gave this address when you checked in. It is not used for anything else.'
  ),
  (
    'support_ticket_reply',
    'Re: {{subject}} [{{ticketId}}]',
    'Our team has replied to your support request.' || chr(10) || chr(10) ||
    'Reference: {{ticketId}}' || chr(10) ||
    'Subject: {{subject}}' || chr(10) || chr(10) ||
    '{{reply}}' || chr(10) || chr(10) ||
    'Reply to this email to add details, or open the Support section of your dashboard.'
  )
) AS d(template_code, subject, body)
JOIN type_definition tc ON tc.domain = 'notification_template_code' AND tc.code = d.template_code
JOIN type_definition ch ON ch.domain = 'notification_channel' AND ch.code = 'email'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_notification_template t
  WHERE t.template_code = tc.id AND t.channel_code = ch.id AND t.deleted_at IS NULL
);

CREATE TEMP TABLE _tpl_update (code TEXT, new_subject TEXT, new_body TEXT) ON COMMIT DROP;
INSERT INTO _tpl_update VALUES
  (
    'visitor_prereg_invite',
    'You are invited to visit {{siteName}}',
    'You have been invited to visit {{siteName}}.' || chr(10) || chr(10) ||
    'Host: {{hostName}}' || chr(10) ||
    'Expected: {{expectedAt}}' || chr(10) ||
    'Valid until: {{validUntil}}' || chr(10) || chr(10) ||
    'Open this link on arrival to check in quickly:' || chr(10) ||
    '{{checkInUrl}}'
  ),
  (
    'credit_note_issued',
    'Credit note {{creditNoteNumber}}',
    'Credit note {{creditNoteNumber}} has been issued against invoice {{invoiceNumber}}.' || chr(10) || chr(10) ||
    'Credit: {{amount}} {{currencyCode}}' || chr(10) ||
    'Balance after credit: {{balanceAfter}} {{currencyCode}}' || chr(10) ||
    'Reason: {{reason}}' || chr(10) || chr(10) ||
    '{{invoiceUrl}}'
  );

CREATE TEMP TABLE _tpl_before ON COMMIT DROP AS
SELECT n.id AS template_id, n.subject AS old_subject, n.body AS old_body, u.new_subject, u.new_body
FROM platform_notification_template n
JOIN type_definition tc ON tc.id = n.template_code AND tc.domain = 'notification_template_code'
JOIN _tpl_update u ON u.code = tc.code
WHERE n.deleted_at IS NULL AND (n.body IS DISTINCT FROM u.new_body OR n.subject IS DISTINCT FROM u.new_subject);

UPDATE platform_notification_template n
SET subject = b.new_subject, body = b.new_body, updated_at = NOW()
FROM _tpl_before b WHERE n.id = b.template_id;

INSERT INTO platform_notification_template_status_log (id, template_id, event_type_code, before_value, after_value, note)
SELECT gen_random_uuid(), b.template_id, ev.id,
       jsonb_build_object('subject', b.old_subject, 'body', b.old_body),
       jsonb_build_object('subject', b.new_subject, 'body', b.new_body),
       'made live (migration 0061)'
FROM _tpl_before b
CROSS JOIN type_definition ev
WHERE ev.domain = 'platform_config_change_event_type' AND ev.code = 'updated';

INSERT INTO platform_notification_template_status_log (id, template_id, event_type_code, after_value, note)
SELECT gen_random_uuid(), t.id, ev.id, jsonb_build_object('subject', t.subject, 'body', t.body), 'seeded from migration 0061'
FROM platform_notification_template t
CROSS JOIN type_definition ev
WHERE ev.domain = 'platform_config_change_event_type' AND ev.code = 'created'
  AND NOT EXISTS (SELECT 1 FROM platform_notification_template_status_log l WHERE l.template_id = t.id);

COMMIT;
