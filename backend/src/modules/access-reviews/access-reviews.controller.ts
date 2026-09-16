import { Body, Controller, Get, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AccessReviewsService, type RecordReviewInput } from "./access-reviews.service";

// Customer-facing (admin/), always scoped to the caller's own organisation
// from their JWT — no organisationId parameter anywhere.
@Controller("access-reviews")
export class AccessReviewsController {
  constructor(private readonly service: AccessReviewsService) {}

  @Get("members")
  @RequirePermission(PERMISSIONS.ACCESS_REVIEW_MANAGE)
  listMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMembersForReview(user.organisationId);
  }

  @Get("summary")
  @RequirePermission(PERMISSIONS.ACCESS_REVIEW_MANAGE)
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.service.summary(user.organisationId);
  }

  @Get("history")
  @RequirePermission(PERMISSIONS.ACCESS_REVIEW_MANAGE)
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listReviewHistory(user.organisationId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ACCESS_REVIEW_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "organisation_access_review.record", resourceType: "organisation_access_review_log" })
  record(@Body() dto: RecordReviewInput, @CurrentUser() user: AuthenticatedUser) {
    return this.service.recordReview(dto, user);
  }
}
