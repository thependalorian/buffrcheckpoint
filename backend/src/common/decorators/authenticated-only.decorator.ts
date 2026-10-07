import { SetMetadata } from "@nestjs/common";

export const AUTHENTICATED_ONLY_KEY = "authenticatedOnly";

// Explicit opt-out from RbacGuard's deny-by-default for state-changing routes
// (buffrcheckpoint.md §5.2 rule 9). Use only for actions a signed-in user
// takes on their own account or their own data subject request — never for
// organisation configuration, which must declare @RequirePermission.
export const AuthenticatedOnly = () => SetMetadata(AUTHENTICATED_ONLY_KEY, true);
