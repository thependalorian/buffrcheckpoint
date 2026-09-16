-- Buffr Checkpoint — organisation_sector expansion
-- The original 5 seeded sectors (0001_type_definitions.sql) covered only the
-- regulated first-mover verticals (bank/government/healthcare/critical
-- infrastructure/SME). Registration should not be gated on an organisation's
-- category fitting a short closed list. Config over code (Wiebe rule 1):
-- this is an INSERT, not a migration. ON CONFLICT DO NOTHING keeps this safe
-- to re-run against a database that already has 0001 applied.

INSERT INTO type_definition (domain, code, label, sort_order) VALUES
  ('organisation_sector', 'education', 'Education / academic institution', 6),
  ('organisation_sector', 'hospitality_tourism', 'Hospitality / tourism', 7),
  ('organisation_sector', 'retail_trade', 'Retail / trade', 8),
  ('organisation_sector', 'manufacturing', 'Manufacturing / industrial', 9),
  ('organisation_sector', 'agriculture', 'Agriculture / agro-processing', 10),
  ('organisation_sector', 'mining_energy', 'Mining / energy', 11),
  ('organisation_sector', 'transport_logistics', 'Transport / logistics', 12),
  ('organisation_sector', 'telecom_ict', 'Telecom / ICT', 13),
  ('organisation_sector', 'real_estate', 'Real estate / property management', 14),
  ('organisation_sector', 'professional_services', 'Professional / consulting services', 15),
  ('organisation_sector', 'ngo_nonprofit', 'NGO / non-profit', 16),
  ('organisation_sector', 'construction', 'Construction', 17),
  ('organisation_sector', 'media_entertainment', 'Media / entertainment', 18),
  ('organisation_sector', 'religious_faith_based', 'Religious / faith-based organisation', 19),
  ('organisation_sector', 'other', 'Other', 99)
ON CONFLICT DO NOTHING;
