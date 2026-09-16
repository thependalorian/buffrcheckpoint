-- ============================================================================
-- Support tickets, made bidirectional (Ops Console data-centric build).
--
-- support_ticket_comments was staff-only and invisible to the org side —
-- the closest thing to a staff<->organisation messaging capability, but
-- one-way. This adds an author-type distinction (Wiebe rule: a
-- type_definition-backed column, not a hardcoded enum) so the same table
-- can carry comments from either side, instead of a new conversation
-- schema. Every existing comment was staff-authored (there was no other
-- path to write one), so the backfill is unambiguous.
-- ============================================================================

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('support_ticket_comment_author_type', 'platform_staff', 'Buffr staff', 1),
  ('support_ticket_comment_author_type', 'organisation_member', 'Organisation member', 2)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

ALTER TABLE support_ticket_comments
  ADD COLUMN IF NOT EXISTS author_type_code UUID REFERENCES type_definition (id);

UPDATE support_ticket_comments
SET author_type_code = (
  SELECT id FROM type_definition
  WHERE domain = 'support_ticket_comment_author_type' AND code = 'platform_staff'
)
WHERE author_type_code IS NULL;

ALTER TABLE support_ticket_comments
  ALTER COLUMN author_type_code SET NOT NULL;
