import { SetMetadata } from "@nestjs/common";

export const PERMISSION_KEY = "requiredPermission";

// Applied per-route. RbacGuard reads this metadata and checks it against the
// caller's role_code/permissions (Section 9.2 rule 1: enforced in the
// API/database layer, never only in the UI).
export const RequirePermission = (permission: string) => SetMetadata(PERMISSION_KEY, permission);
