-- Buffr Checkpoint — Owner-Operator launch acknowledgement (buffrcheckpoint.md v0.34, §11.9.15.7).
--
-- Product-owner decision 2026-10-05 (Option A): one owner acknowledgement is
-- never presented as organisation-wide staff training. The step code stays
-- `role_training`; only its label changes. The §20.4 competence matrix stays
-- the post-launch requirement. Config rows only, no schema change.

UPDATE type_definition
SET label = 'Owner-Operator launch acknowledgement'
WHERE domain = 'onboarding_step_code' AND code = 'role_training' AND deleted_at IS NULL;

UPDATE type_definition
SET label = 'Owner-Operator launch acknowledgement (October 2026)'
WHERE domain = 'staff_training_version' AND code = 'checkpoint_2026_10' AND deleted_at IS NULL;
