-- Align purpose_category type_definition with demo form single_choice options
-- (meeting / vehicle / other) used by check-in form visibility + requiredIf.
-- Partial unique index idx_type_definition_domain_code — use NOT EXISTS, not ON CONFLICT.

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), v.domain, v.code, v.label, v.sort_order
FROM (
  VALUES
    ('purpose_category', 'meeting', 'Meeting', 9),
    ('purpose_category', 'vehicle', 'Vehicle / parking', 10),
    ('purpose_category', 'other', 'Other', 11)
) AS v(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM type_definition t
  WHERE t.domain = v.domain
    AND t.code = v.code
    AND t.deleted_at IS NULL
);
