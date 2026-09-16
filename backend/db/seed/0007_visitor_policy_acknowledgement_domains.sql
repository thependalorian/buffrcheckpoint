-- Buffr Checkpoint kiosk app — Addition B support data.
-- visitor_policy_versions.language_code and
-- visitor_policy_acknowledgements.language_shown_code /
-- acknowledgement_method_code reference type_definition rows that were
-- never seeded (the write endpoint didn't exist before this kiosk work).
-- Adding a new value later is one more INSERT, never a migration.

INSERT INTO type_definition (domain, code, label, sort_order) VALUES
  -- language_code (policy content / acknowledgement display language)
  ('language_code', 'en', 'English', 1),
  ('language_code', 'af', 'Afrikaans', 2),
  ('language_code', 'oshiwambo', 'Oshiwambo', 3),
  ('language_code', 'otjiherero', 'Otjiherero', 4),

  -- acknowledgement_method (how the visitor's acknowledgement was captured)
  ('acknowledgement_method', 'kiosk_tap', 'Kiosk on-screen tap', 1),
  ('acknowledgement_method', 'digital_signature', 'Digital signature capture', 2),
  ('acknowledgement_method', 'printed_form', 'Printed form, manually logged', 3),
  ('acknowledgement_method', 'verbal_witnessed', 'Verbal acknowledgement, staff-witnessed', 4);
