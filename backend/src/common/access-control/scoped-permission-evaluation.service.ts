import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { rolePermissionGrants, typeDefinition } from "../../db/schema";

// Config-over-code (Canonical Engineering Constitution §5.1): a role_code's
// permission set is data in role_permission_grants
// (backend/db/seed/0004_canonical_permissions.sql), not a hardcoded TS map
// — the same "adding a value is an INSERT, never a migration" principle
// this schema already applies to type_definition. Replaces the old
// roleHasPermission()/permissionsForRoleCode() functions.
@Injectable()
export class ScopedPermissionEvaluationService {
  /** Short TTL so INSERT grants (migrations/ops) take effect without restart. */
  private readonly cache = new Map<string, { permissions: Set<string>; expiresAt: number }>();
  private readonly ttlMs = 60_000;

  constructor(@Inject(DB) private readonly db: Database) {}

  async permissionsForRoleCode(roleCode: string): Promise<Set<string>> {
    const cached = this.cache.get(roleCode);
    if (cached && cached.expiresAt > Date.now()) return cached.permissions;

    const roleCodeType = await this.db.query.typeDefinition.findFirst({
      where: and(eq(typeDefinition.domain, "role_code"), eq(typeDefinition.code, roleCode)),
    });
    if (!roleCodeType) return new Set();

    const grants = await this.db.query.rolePermissionGrants.findMany({
      where: eq(rolePermissionGrants.roleCode, roleCodeType.id),
    });
    const permissions = new Set(grants.map((g) => g.permissionCode));
    this.cache.set(roleCode, { permissions, expiresAt: Date.now() + this.ttlMs });
    return permissions;
  }

  async roleHasPermission(roleCode: string, permission: string): Promise<boolean> {
    const permissions = await this.permissionsForRoleCode(roleCode);
    return permissions.has(permission);
  }
}
