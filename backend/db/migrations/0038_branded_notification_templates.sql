-- Branded transactional template catalog (Buffr Checkpoint v1).
-- Adds type_definition codes + platform_notification_template rows.
-- Existing codes (support_access_request, password_reset, platform_staff_invitation)
-- keep their seeded bodies; new codes get default Buffr Checkpoint copy.
-- Optional attachments_json on the outbox for PDF invoice/receipt delivery.

ALTER TABLE notification_delivery_instructions
  ADD COLUMN IF NOT EXISTS attachments_json JSONB NULL;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  -- Identity & security
  ('notification_template_code', 'email_verification', 'Email verification', 10),
  ('notification_template_code', 'account_lockout', 'Account lockout alert', 11),
  ('notification_template_code', 'mfa_enabled', 'MFA enabled confirmation', 12),
  ('notification_template_code', 'password_changed', 'Password changed confirmation', 13),
  -- Org & access
  ('notification_template_code', 'org_welcome', 'Organisation welcome', 20),
  -- Ops intake
  ('notification_template_code', 'ops_new_organisation', 'Ops: new organisation signup', 30),
  ('notification_template_code', 'ops_contact_enquiry', 'Ops: website contact enquiry', 31),
  ('notification_template_code', 'ops_contact_ack', 'Contact enquiry auto-ack', 32),
  -- Billing EFT + POP
  ('notification_template_code', 'invoice_issued', 'Invoice issued', 40),
  ('notification_template_code', 'invoice_reminder', 'Invoice payment reminder', 41),
  ('notification_template_code', 'pop_received_ack', 'Proof of payment received (customer)', 42),
  ('notification_template_code', 'pop_received_ops', 'Proof of payment received (ops)', 43),
  ('notification_template_code', 'pop_rejected', 'Proof of payment rejected', 44),
  ('notification_template_code', 'payment_confirmed', 'Payment confirmed', 45),
  ('notification_template_code', 'receipt_issued', 'Payment receipt issued', 46),
  ('notification_template_code', 'subscription_activated', 'Subscription activated', 47),
  ('notification_template_code', 'suspension_warning', 'Service suspension warning', 48),
  -- KYB
  ('notification_template_code', 'kyb_submitted_ack', 'KYB submission acknowledged', 50),
  ('notification_template_code', 'kyb_verified', 'KYB verified', 51),
  ('notification_template_code', 'kyb_rejected', 'KYB rejected', 52),
  -- Visitor / host
  ('notification_template_code', 'host_visitor_arrived', 'Host: visitor checked in', 60),
  ('notification_template_code', 'host_escalation', 'Host notification escalation', 61),
  -- Support (dormant until ticket create wires it)
  ('notification_template_code', 'support_ticket_ack', 'Support ticket acknowledged', 70),
  -- Dormant catalog (no product trigger yet)
  ('notification_template_code', 'visitor_prereg_invite', 'Visitor pre-registration invite (dormant)', 80),
  ('notification_template_code', 'credit_note_issued', 'Credit note issued (dormant)', 81)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

-- Enrich password_reset body if still the short seed from 0029
UPDATE platform_notification_template t
SET
  subject = 'Reset your Buffr Checkpoint password',
  body =
    'We received a request to reset the password for your Buffr Checkpoint account.' || chr(10) || chr(10) ||
    'Open this link within one hour to choose a new password:' || chr(10) ||
    '{{resetUrl}}' || chr(10) || chr(10) ||
    'If you did not request this, you can ignore this email. Your password will stay the same.',
  updated_at = NOW()
FROM type_definition tc
WHERE tc.domain = 'notification_template_code'
  AND tc.code = 'password_reset'
  AND t.template_code = tc.id
  AND t.deleted_at IS NULL
  AND t.body = 'Password reset requested. Open: {{resetUrl}}';

INSERT INTO platform_notification_template (id, template_code, channel_code, subject, body)
SELECT
  gen_random_uuid(),
  tc.id,
  ch.id,
  d.subject,
  d.body
FROM (VALUES
  (
    'email_verification',
    'Confirm your Buffr Checkpoint account',
    'Confirm your Buffr Checkpoint account by opening this link within 24 hours:' || chr(10) || chr(10) ||
    '{{verifyUrl}}' || chr(10) || chr(10) ||
    'If you did not create this account, ignore this email.'
  ),
  (
    'account_lockout',
    'Buffr Checkpoint sign-in temporarily locked',
    'Someone tried to sign in to your Buffr Checkpoint account with the wrong password several times.' || chr(10) || chr(10) ||
    'Your account is locked for about {{lockoutMinutes}} minutes.' || chr(10) || chr(10) ||
    'If this was not you, reset your password: {{forgotPasswordUrl}}' || chr(10) || chr(10) ||
    'Time (UTC): {{lockedAtUtc}}'
  ),
  (
    'mfa_enabled',
    'Authenticator MFA is now enabled',
    'Authenticator multi-factor authentication is now enabled on your Buffr Checkpoint account ({{email}}).' || chr(10) || chr(10) ||
    'Store your recovery codes somewhere safe. If you did not enable MFA, contact support immediately.'
  ),
  (
    'password_changed',
    'Your Buffr Checkpoint password was changed',
    'The password for your Buffr Checkpoint account ({{email}}) was changed successfully.' || chr(10) || chr(10) ||
    'If you did not make this change, reset your password immediately: {{forgotPasswordUrl}}'
  ),
  (
    'org_welcome',
    'Welcome to Buffr Checkpoint',
    'Welcome to Buffr Checkpoint, {{organisationName}}.' || chr(10) || chr(10) ||
    'Your Owner-Operator account is {{adminEmail}}. Confirm your email if you have not already, then continue onboarding in the admin console:' || chr(10) ||
    '{{adminUrl}}' || chr(10) || chr(10) ||
    'Billing is EFT with proof of payment. Go-live requires an active or trial subscription after POP review.'
  ),
  (
    'ops_new_organisation',
    'New org signup: {{organisationName}}',
    'New Buffr Checkpoint organisation registered (signup-first).' || chr(10) || chr(10) ||
    'Organisation: {{organisationName}}' || chr(10) ||
    'Organisation ID: {{organisationId}}' || chr(10) ||
    'Owner-Operator email: {{adminEmail}}' || chr(10) ||
    'Sector code: {{sectorCode}}' || chr(10) || chr(10) ||
    'Outreach checklist:' || chr(10) ||
    '1) Ask if they will self-complete onboarding or need assisted setup.' || chr(10) ||
    '2) Point them at Pricing then EFT + upload POP under Billing (or grant trial).' || chr(10) ||
    '3) After POP (+ KYB) review, set subscription active — go-live requires active or trial.' || chr(10) || chr(10) ||
    'Admin: {{adminUrl}}' || chr(10) ||
    'Ops: {{opsOrgUrl}}'
  ),
  (
    'ops_contact_enquiry',
    'Buffr Checkpoint contact: {{name}}',
    'Contact from {{name}} <{{email}}>' || chr(10) ||
    'Company: {{company}}' || chr(10) || chr(10) ||
    '{{message}}'
  ),
  (
    'ops_contact_ack',
    'We received your message — Buffr Checkpoint',
    'Hi {{name}},' || chr(10) || chr(10) ||
    'Thanks for contacting Buffr Checkpoint. Our team has received your message and will reply shortly.' || chr(10) || chr(10) ||
    'If you are ready to start, create an account at {{signupUrl}}.'
  ),
  (
    'invoice_issued',
    'Invoice {{invoiceNumber}} from Buffr Checkpoint',
    'Invoice {{invoiceNumber}} for {{organisationName}} is ready.' || chr(10) || chr(10) ||
    'Amount due: {{amount}} {{currencyCode}}' || chr(10) ||
    'Due date: {{dueAt}}' || chr(10) || chr(10) ||
    'Pay by EFT using the bank details on the invoice. Use payment reference {{invoiceNumber}}.' || chr(10) ||
    'Download / view: {{invoiceUrl}}' || chr(10) || chr(10) ||
    'After payment, upload proof of payment in Admin → Billing.'
  ),
  (
    'invoice_reminder',
    'Reminder: invoice {{invoiceNumber}} is unpaid',
    'This is a reminder that invoice {{invoiceNumber}} for {{organisationName}} remains unpaid.' || chr(10) || chr(10) ||
    'Amount due: {{amount}} {{currencyCode}}' || chr(10) ||
    'Due date: {{dueAt}}' || chr(10) ||
    'View invoice: {{invoiceUrl}}'
  ),
  (
    'pop_received_ack',
    'We received your proof of payment',
    'We received proof of payment for invoice {{invoiceNumber}} ({{amount}} {{currencyCode}}).' || chr(10) || chr(10) ||
    'Our finance team will reconcile it against the bank statement. You will get another email when it is confirmed or if we need a correction.'
  ),
  (
    'pop_received_ops',
    'POP uploaded: {{invoiceNumber}} / {{organisationName}}',
    'Proof of payment uploaded for review.' || chr(10) || chr(10) ||
    'Organisation: {{organisationName}}' || chr(10) ||
    'Invoice: {{invoiceNumber}}' || chr(10) ||
    'Amount: {{amount}} {{currencyCode}}' || chr(10) ||
    'Submitted by: {{submittedByEmail}}' || chr(10) ||
    'Ops review: {{opsBillingUrl}}'
  ),
  (
    'pop_rejected',
    'Proof of payment could not be confirmed',
    'We could not confirm the proof of payment for invoice {{invoiceNumber}}.' || chr(10) || chr(10) ||
    '{{note}}' || chr(10) || chr(10) ||
    'Please upload a clearer POP or correct the payment reference, then resubmit from Admin → Billing.' || chr(10) ||
    '{{invoiceUrl}}'
  ),
  (
    'payment_confirmed',
    'Payment confirmed for invoice {{invoiceNumber}}',
    'Payment for invoice {{invoiceNumber}} ({{amount}} {{currencyCode}}) has been confirmed.' || chr(10) || chr(10) ||
    'Thank you. Your subscription entitlement will update once billing status is active or trial.'
  ),
  (
    'receipt_issued',
    'Receipt for invoice {{invoiceNumber}}',
    'Please find your receipt for invoice {{invoiceNumber}} ({{amount}} {{currencyCode}}).' || chr(10) || chr(10) ||
    'Download: {{receiptUrl}}'
  ),
  (
    'subscription_activated',
    'Your Buffr Checkpoint subscription is active',
    'Good news — the subscription for {{organisationName}} is now {{statusCode}}.' || chr(10) || chr(10) ||
    'You can complete go-live and start visitor check-in from the admin console:' || chr(10) ||
    '{{adminUrl}}'
  ),
  (
    'suspension_warning',
    'Action needed: Buffr Checkpoint access may be limited',
    'The subscription for {{organisationName}} is not active or on trial.' || chr(10) || chr(10) ||
    'Go-live and operational check-in stay blocked until billing is settled (EFT + POP) or a trial is granted.' || chr(10) ||
    'Billing: {{billingUrl}}'
  ),
  (
    'kyb_submitted_ack',
    'KYB documents received',
    'We received the business verification (KYB) pack for {{organisationName}}.' || chr(10) || chr(10) ||
    'Our team will review it. You will receive an email when it is verified or if we need more information.'
  ),
  (
    'kyb_verified',
    'Business verification approved',
    'Business verification (KYB) for {{organisationName}} is approved.' || chr(10) || chr(10) ||
    'You can proceed with billing activation and go-live when your subscription is active or on trial.'
  ),
  (
    'kyb_rejected',
    'Business verification needs attention',
    'Business verification (KYB) for {{organisationName}} was not approved.' || chr(10) || chr(10) ||
    '{{note}}' || chr(10) || chr(10) ||
    'Please correct the details and resubmit from Admin → KYB.'
  ),
  (
    'host_visitor_arrived',
    '{{visitorName}} is waiting at {{siteLabel}} reception',
    '{{visitorName}} has checked in at {{siteLabel}}.' || chr(10) || chr(10) ||
    '{{detailBlock}}' || chr(10) || chr(10) ||
    'Please come to reception to meet them.'
  ),
  (
    'host_escalation',
    'Escalation: visitor still waiting ({{actionCode}})',
    'Escalation ({{actionCode}}) for visit {{visitId}} at {{siteLabel}}.' || chr(10) || chr(10) ||
    'Visitor: {{visitorName}}' || chr(10) ||
    'Original host notification was not acknowledged within the configured wait window.'
  ),
  (
    'support_ticket_ack',
    'We received your support request',
    'Hi {{name}},' || chr(10) || chr(10) ||
    'We received support ticket {{ticketReference}}. Our team will follow up shortly.' || chr(10) || chr(10) ||
    '(Dormant template — wire when customer ticket-create emails are enabled.)'
  ),
  (
    'visitor_prereg_invite',
    'You are invited to visit {{siteLabel}}',
    'You have been invited to visit {{siteLabel}} on {{visitDate}}.' || chr(10) || chr(10) ||
    'Complete pre-registration: {{preregUrl}}' || chr(10) || chr(10) ||
    '(Dormant — no product trigger yet.)'
  ),
  (
    'credit_note_issued',
    'Credit note {{creditNoteNumber}}',
    'Credit note {{creditNoteNumber}} for {{amount}} {{currencyCode}} has been issued.' || chr(10) || chr(10) ||
    '(Dormant — no credit-note domain yet.)'
  )
) AS d(template_code, subject, body)
JOIN type_definition tc ON tc.domain = 'notification_template_code' AND tc.code = d.template_code
JOIN type_definition ch ON ch.domain = 'notification_channel' AND ch.code = 'email'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_notification_template t
  WHERE t.template_code = tc.id AND t.channel_code = ch.id AND t.deleted_at IS NULL
);

INSERT INTO platform_notification_template_status_log (id, template_id, event_type_code, after_value, note)
SELECT
  gen_random_uuid(),
  t.id,
  ev.id,
  jsonb_build_object('subject', t.subject, 'body', t.body),
  'seeded from migration 0038'
FROM platform_notification_template t
CROSS JOIN type_definition ev
WHERE ev.domain = 'platform_config_change_event_type' AND ev.code = 'created'
  AND NOT EXISTS (
    SELECT 1 FROM platform_notification_template_status_log l WHERE l.template_id = t.id
  );
