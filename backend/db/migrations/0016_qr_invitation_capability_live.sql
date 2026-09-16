-- Mark QR invitation check-in live after v0.21 token lifecycle shipped.

UPDATE platform_capability_approvals pca
SET
  status_code = sv.id,
  public_display_status = pv.id,
  updated_at = now()
FROM type_definition cc,
     type_definition sv,
     type_definition pv
WHERE pca.capability_code = cc.id
  AND cc.domain = 'capability_code'
  AND cc.code = 'qr_invitation_checkin'
  AND sv.domain = 'capability_status_value'
  AND sv.code = 'live'
  AND pv.domain = 'public_capability_status_value'
  AND pv.code = 'live';
