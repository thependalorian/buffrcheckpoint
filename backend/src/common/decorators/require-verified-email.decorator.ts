import { SetMetadata } from "@nestjs/common";

export const REQUIRE_VERIFIED_EMAIL_KEY = "requireVerifiedEmail";

// Section 9.2 rule 8 (v0.4): login is never blocked by an unverified email
// (Section 9.1a — an unverified Owner-Operator still needs day-one access),
// but a privileged action — role change, capability-status write, evidence
// export — additionally requires email_verified_at IS NOT NULL. Applied
// per-route; RbacGuard checks this metadata after the permission check.
export const RequireVerifiedEmail = () => SetMetadata(REQUIRE_VERIFIED_EMAIL_KEY, true);
