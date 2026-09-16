import { Body, Controller, Get, Param, Patch, Post, Query, Res, StreamableFile } from "@nestjs/common";
import type { Response } from "express";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { KybService, type SubmitKybInput } from "./kyb.service";

@Controller("platform/kyb")
export class KybController {
  constructor(private readonly service: KybService) {}

  // Customer-facing submission. Now on its own permission code (migration
  // 0029) rather than the broad visit.history.read it used to borrow —
  // submitting business-identity documents is not a reporting read, and every
  // read-only reporting role held that permission.
  @Post("submissions")
  @RequirePermission(PERMISSIONS.ORGANISATION_KYB_SUBMIT)
  submit(@Body() dto: SubmitKybInput, @CurrentUser() user: AuthenticatedUser) {
    return this.service.submit(dto, user);
  }

  @Get("pending")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  listPending() {
    return this.service.listPending();
  }

  // @Res() WITHOUT passthrough — hands us full manual control of the
  // response, not the usual declarative return. NestJS's Express adapter
  // treats a returned `null` exactly like `undefined` (the isNil check in
  // reply()) and sends a completely empty body, not JSON "null". Every
  // caller expects `KybVerification | null` and calls `.json()` on the
  // response, which throws "Unexpected end of JSON input" on an empty
  // body — confirmed live via Vercel runtime error logs for every
  // organisation with no KYB submission yet. (`passthrough: true` would
  // NOT fix this — Nest would still run its own reply() afterwards on
  // this handler's `undefined` return and try to write the response a
  // second time.)
  @Get("organisation")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  @PlatformScoped()
  async getForOrganisation(@Query("organisationId") organisationId: string, @Res() res: Response) {
    const result = await this.service.getLatestForOrganisation(organisationId);
    res.status(200).json(result);
  }

  // Customer-facing status read — organisationId always the caller's own,
  // never client-supplied. `getForOrganisation` above is staff-review-only
  // (PLATFORM_KYB_REVIEW); a customer checking their own submission status
  // (admin/'s dashboard/kyb page) has neither that permission nor any
  // business needing an arbitrary organisationId, so it needs its own
  // route rather than reusing that one — confirmed live: every customer
  // got a 403 hitting the staff endpoint before this existed. Reads sit on
  // the same organisation.kyb.submit code as the write: whoever files the
  // submission is who needs to see its status.
  @Get("organisation/mine")
  @RequirePermission(PERMISSIONS.ORGANISATION_KYB_SUBMIT)
  async getOwnOrganisation(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const result = await this.service.getLatestForOrganisation(user.organisationId);
    res.status(200).json(result);
  }

  @Get("organisation/history")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  @PlatformScoped()
  getHistoryForOrganisation(@Query("organisationId") organisationId: string) {
    return this.service.history(organisationId);
  }

  @Get("submissions/:kybVerificationId/document")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  @PlatformScoped()
  async getDocument(@Param("kybVerificationId") kybVerificationId: string) {
    const { name, content } = await this.service.getDocument(kybVerificationId);
    return new StreamableFile(content, {
      disposition: `attachment; filename="${name.replace(/"/g, "")}"`,
    });
  }

  @Patch("submissions/bulk-decision")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  @AuditLog({ action: "organisation_kyb_verification.decide_bulk", resourceType: "organisation_kyb_verification" })
  decideBulk(
    @Body() body: { kybVerificationIds: string[]; decision: "verified" | "rejected"; note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.decideBulk(body.kybVerificationIds ?? [], body.decision, user, body.note);
  }

  @Patch("submissions/:kybVerificationId/decision")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  @AuditLog({ action: "organisation_kyb_verification.decide", resourceType: "organisation_kyb_verification" })
  decide(
    @Param("kybVerificationId") kybVerificationId: string,
    @Body() body: { decision: "verified" | "rejected"; note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.decide(kybVerificationId, body.decision, user, body.note);
  }
}
