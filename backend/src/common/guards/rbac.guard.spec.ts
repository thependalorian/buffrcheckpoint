import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { Database } from "../../db/client";
import type { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import type { ScopedPermissionEvaluationService } from "../access-control/scoped-permission-evaluation.service";
import { AuthenticatedOnly } from "../decorators/authenticated-only.decorator";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";
import { Public } from "../decorators/public.decorator";
import { RequireMfa } from "../decorators/require-mfa.decorator";
import { RequirePermission } from "../decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../rbac/permissions";
import { RbacGuard } from "./rbac.guard";

class Routes {
  @RequirePermission(PERMISSIONS.ONBOARDING_MANAGE)
  @RequireVerifiedEmail()
  @RequireMfa()
  completeStep() {
    // Body irrelevant: the guard only reads decorator metadata.
  }

  undeclaredMutation() {
    // Body irrelevant: the guard only reads decorator metadata.
  }

  @AuthenticatedOnly()
  @RequireVerifiedEmail()
  enrolMfa() {
    // Body irrelevant: the guard only reads decorator metadata.
  }

  @Public()
  login() {
    // Body irrelevant: the guard only reads decorator metadata.
  }

  @RequireMfa()
  readWithMfa() {
    // Body irrelevant: the guard only reads decorator metadata.
  }
}

const GRANTS: Record<string, string[]> = {
  owner_operator: [PERMISSIONS.ONBOARDING_MANAGE],
  host: [],
};

function user(roleCode: string, overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: "u1",
    organisationId: "o1",
    siteId: null,
    roleCode,
    permissions: [],
    emailVerified: true,
    mfaEnabled: true,
    audience: "admin",
    ...overrides,
  } as AuthenticatedUser;
}

function context(handler: keyof Routes, method: string, requestUser?: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => Routes.prototype[handler],
    getClass: () => Routes,
    switchToHttp: () => ({ getRequest: () => ({ method, user: requestUser }) }),
  } as unknown as ExecutionContext;
}

describe("RbacGuard (§9.2 rule 10)", () => {
  const permissionEvaluation = {
    roleHasPermission: jest.fn(async (role: string, permission: string) => (GRANTS[role] ?? []).includes(permission)),
  } as unknown as ScopedPermissionEvaluationService;
  const guard = new RbacGuard(new Reflector(), {} as Database, permissionEvaluation, {} as TypeDefinitionLookupService);

  it("refuses a host token on complete-step", async () => {
    await expect(guard.canActivate(context("completeStep", "POST", user("host")))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("lets an Owner-Operator with MFA complete a step", async () => {
    await expect(guard.canActivate(context("completeStep", "POST", user("owner_operator")))).resolves.toBe(true);
  });

  it("refuses an Owner-Operator without MFA", async () => {
    await expect(
      guard.canActivate(context("completeStep", "POST", user("owner_operator", { mfaEnabled: false }))),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("denies a mutation with no declared policy and allows the same handler as a read", async () => {
    await expect(guard.canActivate(context("undeclaredMutation", "DELETE", user("owner_operator")))).rejects.toThrow(
      "no declared access policy",
    );
    await expect(guard.canActivate(context("undeclaredMutation", "GET", user("host")))).resolves.toBe(true);
  });

  it("honours the explicit opt-out but still enforces verified email", async () => {
    await expect(guard.canActivate(context("enrolMfa", "POST", user("host", { mfaEnabled: false })))).resolves.toBe(
      true,
    );
    await expect(
      guard.canActivate(context("enrolMfa", "POST", user("host", { emailVerified: false }))),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("enforces @RequireMfa on routes without a permission", async () => {
    await expect(
      guard.canActivate(context("readWithMfa", "GET", user("host", { mfaEnabled: false }))),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("passes public routes without a user", async () => {
    await expect(guard.canActivate(context("login", "POST"))).resolves.toBe(true);
  });
});
