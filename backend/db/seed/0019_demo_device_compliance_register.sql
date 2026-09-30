-- Demo Front Desk kiosk hardware for marketing screenshots and onboarding walkthroughs.
-- Site: 74c72c99-93dc-4b33-934b-9b365e9924cf (Demo Front Desk, Buffr Analytics).

DO $$
DECLARE
  v_org UUID := 'b51f0704-12a7-45d4-8b0d-3642785b6e77';
  v_site UUID := '74c72c99-93dc-4b33-934b-9b365e9924cf';
  v_cran_mdm UUID;
  v_cran_approved UUID;
  v_mdm_enrolled UUID;
BEGIN
  SELECT id INTO v_cran_mdm FROM type_definition WHERE domain = 'cran_compliance_status' AND code = 'mdm_enrolled';
  SELECT id INTO v_cran_approved FROM type_definition WHERE domain = 'cran_compliance_status' AND code = 'approved_for_deployment';
  SELECT id INTO v_mdm_enrolled FROM type_definition WHERE domain = 'device_status' AND code = 'operational';

  IF v_cran_mdm IS NULL OR v_cran_approved IS NULL THEN
    RAISE EXCEPTION 'cran_compliance_status type rows missing';
  END IF;

  INSERT INTO managed_kiosk_devices (
    id, organisation_id, site_id, device_name, manufacturer, model, serial_number,
    radio_wifi, radio_bluetooth, radio_nfc, radio_cellular,
    cran_compliance_status_code, cran_certificate_reference, supplier_evidence_reference,
    firmware_version, mdm_enrolment_status
  )
  VALUES (
    'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    v_org, v_site, 'Reception kiosk', 'Samsung', 'Galaxy Tab Active5', 'SM-X306B-DEMO-001',
    TRUE, TRUE, FALSE, FALSE,
    v_cran_approved, 'CRAN-2026-NA-004821', 'supplier-pack/demo-front-desk-tab-active5.pdf',
    '14.0.1', v_mdm_enrolled
  )
  ON CONFLICT (id) DO UPDATE SET
    cran_compliance_status_code = EXCLUDED.cran_compliance_status_code,
    cran_certificate_reference = EXCLUDED.cran_certificate_reference,
    firmware_version = EXCLUDED.firmware_version,
    deleted_at = NULL;

  INSERT INTO managed_kiosk_devices (
    id, organisation_id, site_id, device_name, manufacturer, model, serial_number,
    radio_wifi, radio_bluetooth, radio_nfc, radio_cellular,
    cran_compliance_status_code, supplier_evidence_reference, firmware_version, mdm_enrolment_status
  )
  VALUES (
    'b2c3d4e5-f6a7-4890-b123-456789abcdef',
    v_org, v_site, 'Lobby visitor kiosk', 'Zebra', 'ET40', 'ET40-DEMO-002',
    TRUE, FALSE, TRUE, FALSE,
    v_cran_mdm, 'supplier-pack/zebra-et40-wifi-only.pdf',
    '13.2.4', v_mdm_enrolled
  )
  ON CONFLICT (id) DO UPDATE SET
    cran_compliance_status_code = EXCLUDED.cran_compliance_status_code,
    supplier_evidence_reference = EXCLUDED.supplier_evidence_reference,
    deleted_at = NULL;
END $$;
