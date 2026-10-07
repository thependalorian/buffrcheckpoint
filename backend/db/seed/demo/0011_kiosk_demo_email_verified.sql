-- Ensure the emulator kiosk demo account can obtain a JWT (email gate).
-- Without email_verified_at, login returns emailVerificationRequired and the
-- kiosk keeps a stale SharedPreferences QR payload (historically buffrconnect.com).
UPDATE application_users
SET email_verified_at = COALESCE(email_verified_at, NOW())
WHERE email = 'kiosk-demo@buffrcheckpoint.test'
  AND deleted_at IS NULL;
