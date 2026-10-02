-- Buffr Checkpoint — Canonical Engineering Constitution rename, Stage 2
-- Repoints the handful of tables NOT being renamed (organisation_capability_enablement,
-- evidence_pack, site_checkin_code, access_policy) at the new organisations/
-- sites/security_zones tables, then drops every table superseded by
-- 0008_canonical_rename.sql. Run only after 0008 has been applied and
-- verified.

-- --- repoint leftover un-renamed tables at the new parent tables -----------

ALTER TABLE organisation_capability_enablement
  DROP CONSTRAINT organisation_capability_enablement_organisation_id_fkey,
  ADD CONSTRAINT organisation_capability_enablement_organisation_id_fkey
    FOREIGN KEY (organisation_id) REFERENCES organisations (id);

ALTER TABLE evidence_pack
  DROP CONSTRAINT evidence_pack_organisation_id_fkey,
  ADD CONSTRAINT evidence_pack_organisation_id_fkey
    FOREIGN KEY (organisation_id) REFERENCES organisations (id);

ALTER TABLE site_checkin_code
  DROP CONSTRAINT site_checkin_code_organisation_id_fkey,
  DROP CONSTRAINT site_checkin_code_site_id_fkey,
  ADD CONSTRAINT site_checkin_code_organisation_id_fkey
    FOREIGN KEY (organisation_id) REFERENCES organisations (id),
  ADD CONSTRAINT site_checkin_code_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES sites (id);

ALTER TABLE access_policy
  DROP CONSTRAINT access_policy_organisation_id_fkey,
  DROP CONSTRAINT access_policy_site_id_fkey,
  DROP CONSTRAINT access_policy_zone_id_fkey,
  ADD CONSTRAINT access_policy_organisation_id_fkey
    FOREIGN KEY (organisation_id) REFERENCES organisations (id),
  ADD CONSTRAINT access_policy_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES sites (id),
  ADD CONSTRAINT access_policy_zone_id_fkey
    FOREIGN KEY (zone_id) REFERENCES security_zones (id);

-- --- drop everything superseded by 0008, children before parents -----------

DROP TABLE workflow_policy_version;
DROP TABLE workflow_policy;
DROP TABLE site_capture_channel_policy;
DROP TABLE form_field_rule;

DROP TABLE emergency_roster_snapshot;
DROP TABLE emergency_event;

DROP TABLE notification_event;

DROP TABLE dsar_status_log;
DROP TABLE data_subject_request;

DROP TABLE credential_status_log;
DROP TABLE credential;

DROP TABLE identity_verification_event;

DROP TABLE consent_acknowledgement;
DROP TABLE consent_agreement;

DROP TABLE legal_hold_status_log;
DROP TABLE legal_hold;

DROP TABLE retention_policy;

DROP TABLE visitor_type_policy;
DROP TABLE form_field_definition;
DROP TABLE form_template_version;
DROP TABLE form_template;

DROP TABLE visit_status_log;
-- visit references visit_invitation, so it is dropped first (order corrected
-- 2026-10-02: the original order failed on a from-scratch replay; the end
-- state is identical).
DROP TABLE visit;
DROP TABLE visit_invitation_status_log;
DROP TABLE visit_invitation;

DROP TABLE visitor;

DROP TABLE device_status_log;
DROP TABLE device;

DROP TABLE host;

DROP TABLE role_assignment_status_log;
DROP TABLE role_assignment;
DROP TABLE support_access_grant;
DROP TABLE password_reset_token;
DROP TABLE user_account;
DROP TABLE role;

DROP TABLE platform_capability_status;
DROP TABLE audit_event;

DROP TABLE zone;
DROP TABLE site;
DROP TABLE region;
DROP TABLE organisation;
