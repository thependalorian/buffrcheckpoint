-- Buffr Checkpoint v0.22 — identity_assurance_level canonical labels
-- Codes remain V0–V4; labels match Part One §5.2 / §5.2a.

UPDATE type_definition
SET label = 'Self-asserted identity'
WHERE domain = 'identity_assurance_level' AND code = 'V0';

UPDATE type_definition
SET label = 'Contact-channel possession'
WHERE domain = 'identity_assurance_level' AND code = 'V1';

UPDATE type_definition
SET label = 'Site-issued credential possession'
WHERE domain = 'identity_assurance_level' AND code = 'V2';

UPDATE type_definition
SET label = 'DigiNam / NPKI verified identity'
WHERE domain = 'identity_assurance_level' AND code = 'V3';

UPDATE type_definition
SET label = 'Official e-ID cryptographic validation'
WHERE domain = 'identity_assurance_level' AND code = 'V4';
