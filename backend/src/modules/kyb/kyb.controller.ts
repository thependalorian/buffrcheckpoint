import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import {
  DecideKybBulkDto,
  DecideKybDocumentDto,
  DecideKybDto,
  SubmitKybDto,
  UploadKybDocumentDto,
  ValidateKybDto,
} from "./dto/kyb.dto";
import { KybService } from "./kyb.service";
import { MAX_DOCUMENT_BYTES } from "./kyb-validation";

@Controller("platform/kyb")
export class KybController {
  constructor(private readonly service: KybService) {}

  // Customer-facing submission. Now on its own permission code (migration
  // 0029) rather than the broad visit.history.read it used to borrow —
  // submitting business-identity documents is not a reporting read, and every
  // read-only reporting role held that permission.
  @Post("submissions")
  @RequirePermission(PERMISSIONS.ORGANISATION_KYB_SUBMIT)
  @AuditLog({ action: "organisation_kyb_verification.submit", resourceType: "organisation_kyb_verification" })
  submit(@Body() dto: SubmitKybDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.submit(dto, user);
  }

  // Checks the details the way a submission would, saving nothing. The admin form calls it as the person types.
  @Post("validate")
  @RequirePermission(PERMISSIONS.ORGANISATION_KYB_SUBMIT)
  validate(@Body() dto: ValidateKybDto) {
    return this.service.validate(dto);
  }

  // One supporting document at a time. The organisation is always the caller's own. The file is stored, then read in the background.
  @Post("documents")
  @RequirePermission(PERMISSIONS.ORGANISATION_KYB_SUBMIT)
  @AuditLog({ action: "organisation_kyb_document.upload", resourceType: "organisation_kyb_document" })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 } }))
  uploadDocument(
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
    @Body() dto: UploadKybDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.uploadDocument(user.organisationId, user, file, dto.documentType);
  }

  @Get("documents/mine")
  @RequirePermission(PERMISSIONS.ORGANISATION_KYB_SUBMIT)
  listOwnDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listDocuments(user.organisationId);
  }

  @Delete("documents/:documentId")
  @RequirePermission(PERMISSIONS.ORGANISATION_KYB_SUBMIT)
  @AuditLog({ action: "organisation_kyb_document.remove", resourceType: "organisation_kyb_document" })
  removeDocument(@Param("documentId") documentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.deleteDocument(documentId, user.organisationId);
  }

  // The organisation's own latest submission with its details in clear, its documents and what the reviewer asked for.
  @Get("organisation/mine/details")
  @RequirePermission(PERMISSIONS.ORGANISATION_KYB_SUBMIT)
  getOwnDetails(@CurrentUser() user: AuthenticatedUser) {
    return this.service.mine(user.organisationId);
  }

  @Get("pending")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  listPending() {
    return this.service.listPending();
  }

  @Get("awaiting-organisation")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  listAwaitingOrganisation() {
    return this.service.listAwaitingOrganisation();
  }

  @Get("submissions/:kybVerificationId/review")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  @PlatformScoped()
  review(@Param("kybVerificationId") kybVerificationId: string) {
    return this.service.review(kybVerificationId);
  }

  // Opens in the browser (inline) so a reviewer can read it beside the details.
  @Get("documents/:documentId/file")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  @PlatformScoped()
  async getDocumentFile(@Param("documentId") documentId: string) {
    const { name, contentType, content } = await this.service.getDocumentFile(documentId);
    return new StreamableFile(content, { type: contentType, disposition: `inline; filename="${name.replace(/"/g, "")}"` });
  }

  @Patch("documents/:documentId/decision")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  @AuditLog({ action: "organisation_kyb_document.decide", resourceType: "organisation_kyb_document" })
  decideDocument(
    @Param("documentId") documentId: string,
    @Body() body: DecideKybDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.decideDocument(documentId, body.decision, user, body.note);
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
    @Body() body: DecideKybBulkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.decideBulk(body.kybVerificationIds, body.decision, user, body.note);
  }

  @Patch("submissions/:kybVerificationId/decision")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  @AuditLog({ action: "organisation_kyb_verification.decide", resourceType: "organisation_kyb_verification" })
  decide(
    @Param("kybVerificationId") kybVerificationId: string,
    @Body() body: DecideKybDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.decide(kybVerificationId, body.decision, user, body.note, body.flaggedFields, body.registryChecked);
  }
}
