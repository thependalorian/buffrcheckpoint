/**
 * Buffr Checkpoint My Account model.
 *
 * Backed by GET /auth/me.
 * The account switcher should show actual organisation memberships returned by
 * /auth/me, or be removed for Release 1 if each user belongs to one customer
 * organisation only.
 */

export interface MyAccount {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  organisationId: string;
  organisationName: string;
  memberships: Array<{
    roleCode: string;
    roleLabel: string;
    scopeType: "organisation" | "region" | "site";
    scopeIds: string[];
  }>;
  lastLoginAt: string | null;
}

// Demo profile removed — no employee/contractor HR data may ship in the
// Buffr Checkpoint admin application. Populate from GET /auth/me.
