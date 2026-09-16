import { SetMetadata } from "@nestjs/common";

export const PLATFORM_SCOPED_KEY = "platformScoped";

// Opts a route out of TenantScopeGuard's organisationId-query/param match
// check (tenant-scope.guard.ts). That check exists to stop a customer-side
// user reaching another organisation's data by editing a URL/query param —
// correct and required there. It's also, by default, too strict for the
// Platform Ops Console's own cross-org endpoints (e.g. viewing one org's
// CRM/billing/KYB detail from the console's organisation drill-in page):
// a platform_support user's own organisationId is an unrelated home-org
// placeholder, so an unmodified TenantScopeGuard would 403 every one of
// these legitimate calls. Apply this ONLY to routes that are already
// gated by a platform.*-prefixed permission (never a customer-facing
// route) — the permission check plus RbacGuard's break-glass grant
// re-check (for anything actually reached via a support session) remain
// the real access-control boundary; this decorator only removes a
// same-org assumption that doesn't apply to platform-wide staff.
export const PlatformScoped = () => SetMetadata(PLATFORM_SCOPED_KEY, true);
