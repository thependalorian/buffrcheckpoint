-- Buffr Checkpoint — type_definition seed data for migration 0006
-- Source of truth: docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md Section 11.4.5a
-- Adding a new value later is one more INSERT, never a migration.

INSERT INTO type_definition (domain, code, label, sort_order) VALUES
  -- legal_basis_code (Section 11.4.5a — "notice is not always consent")
  ('legal_basis_code', 'mandatory_notice', 'Mandatory notice', 1),
  ('legal_basis_code', 'optional_consent', 'Optional consent', 2),

  -- field_class (Part Three §5.1's dynamic form builder field classes)
  ('field_class', 'core', 'Core', 1),
  ('field_class', 'basic', 'Basic', 2),
  ('field_class', 'sensitive', 'Sensitive', 3),
  ('field_class', 'high_risk', 'High risk', 4),
  ('field_class', 'verification_evidence', 'Verification evidence', 5),
  ('field_class', 'free_text', 'Free text', 6),

  -- rule_type (form_field_rule.rule_type_code — validation/visibility rules
  -- applied to a form field, e.g. required-if, format, min/max length)
  ('rule_type', 'required_if', 'Required if', 1),
  ('rule_type', 'format', 'Format', 2),
  ('rule_type', 'min_length', 'Minimum length', 3),
  ('rule_type', 'max_length', 'Maximum length', 4),
  ('rule_type', 'visible_if', 'Visible if', 5);
