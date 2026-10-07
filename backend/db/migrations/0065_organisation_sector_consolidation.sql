-- 0065: consolidate the organisation sector list from 20 values to 12 (11 sectors and Other).
--
-- Why: 20 sectors overwhelmed the people choosing one at sign-up and made ops and analytics read a long tail of near-empty
-- categories (Retail beside Trade, Media beside Entertainment, Mining beside Energy). The new list follows the common
-- industry classifications (finance, health, energy and utilities, transport, technology and telecom, retail, manufacturing,
-- education, hospitality and entertainment, government, corporate and professional services) and keeps Other as the catch-all.
--
-- Shape: the list stays flat. One code per organisation, no parent or child sectors, no display groups, so analytics count
-- organisations by the single stored code. Retired codes are soft-deleted (rows kept so history still resolves), and each
-- organisation on a retired code is re-pointed to the code that now covers it. Adding a sector later is a single INSERT.
--
-- Idempotent and re-runnable, and atomic (one transaction). No triggers, no cascades, no CHECK lists.

BEGIN;

-- 1. The twelve values: insert any that are missing, then set label and display order for all of them.
INSERT INTO type_definition (domain, code, label, sort_order)
SELECT 'organisation_sector', v.code, v.label, v.sort_order
FROM (VALUES
  ('sme',                   'Corporate office or professional services',  1),
  ('government',            'Government and public administration',               2),
  ('financial_services',    'Banking, finance and insurance',             3),
  ('healthcare',            'Healthcare',                                 4),
  ('education',             'Education and training',                     5),
  ('energy_utilities',      'Energy, mining and utilities',               6),
  ('transport_logistics',   'Transport and logistics',                    7),
  ('technology_telecom',    'Technology and telecommunications',          8),
  ('hospitality_tourism',   'Hospitality, tourism and entertainment',     9),
  ('retail_trade',          'Retail and wholesale',                      10),
  ('manufacturing',         'Manufacturing, construction and agriculture', 11),
  ('other',                 'Other',                                     99)
) AS v(code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition t
  WHERE t.domain = 'organisation_sector' AND t.code = v.code AND t.deleted_at IS NULL
);

UPDATE type_definition t
SET label = v.label, sort_order = v.sort_order
FROM (VALUES
  ('sme',                   'Corporate office or professional services',  1),
  ('government',            'Government and public administration',               2),
  ('financial_services',    'Banking, finance and insurance',             3),
  ('healthcare',            'Healthcare',                                 4),
  ('education',             'Education and training',                     5),
  ('energy_utilities',      'Energy, mining and utilities',               6),
  ('transport_logistics',   'Transport and logistics',                    7),
  ('technology_telecom',    'Technology and telecommunications',          8),
  ('hospitality_tourism',   'Hospitality, tourism and entertainment',     9),
  ('retail_trade',          'Retail and wholesale',                      10),
  ('manufacturing',         'Manufacturing, construction and agriculture', 11),
  ('other',                 'Other',                                     99)
) AS v(code, label, sort_order)
WHERE t.domain = 'organisation_sector'
  AND t.code = v.code
  AND t.deleted_at IS NULL
  AND (t.label <> v.label OR t.sort_order <> v.sort_order);

-- 2. Re-point organisations on a retired code to the code that now covers it.
UPDATE organisations o
SET sector_code = new_t.id
FROM type_definition old_t
JOIN (VALUES
  ('bank',                    'financial_services'),
  ('critical_infrastructure', 'energy_utilities'),
  ('mining_energy',           'energy_utilities'),
  ('telecom_ict',             'technology_telecom'),
  ('professional_services',   'sme'),
  ('real_estate',             'sme'),
  ('media_entertainment',     'hospitality_tourism'),
  ('construction',            'manufacturing'),
  ('agriculture',             'manufacturing'),
  ('ngo_nonprofit',           'other'),
  ('religious_faith_based',   'other')
) AS m(old_code, new_code) ON m.old_code = old_t.code
JOIN type_definition new_t
  ON new_t.domain = 'organisation_sector' AND new_t.code = m.new_code AND new_t.deleted_at IS NULL
WHERE old_t.domain = 'organisation_sector'
  AND o.sector_code = old_t.id;

-- 3. Retire the old codes. Soft delete only: the rows stay so nothing that ever pointed at them breaks.
UPDATE type_definition
SET deleted_at = NOW()
WHERE domain = 'organisation_sector'
  AND deleted_at IS NULL
  AND code IN ('bank', 'critical_infrastructure', 'mining_energy', 'telecom_ict', 'professional_services', 'real_estate',
               'media_entertainment', 'construction', 'agriculture', 'ngo_nonprofit', 'religious_faith_based');

COMMIT;
