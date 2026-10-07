import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AcknowledgeInductionDto, PublishNoticeDto } from "./dto/site-notices.dto";
import { isNoticeKind, type NoticeKind } from "./site-notices";
import { SiteNoticesService } from "./site-notices.service";

function kindOf(value: string): NoticeKind {
  if (!isNoticeKind(value)) throw new BadRequestException("Notice kind must be emergency or induction");
  return value;
}

@Controller("site-notices")
export class SiteNoticesController {
  constructor(private readonly notices: SiteNoticesService) {}

  /** Whether a contractor visit needs the induction and has acknowledged it. Declared before ":kind" so "visits" is not read as a kind. */
  @Get("induction/visits/:visitId")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  inductionStatus(@Param("visitId") visitId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notices.inductionStatus(visitId, user);
  }

  @Get(":kind")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  get(
    @Param("kind") kind: string,
    @Query("siteId") siteId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notices.getForStaff(kindOf(kind), siteId, user);
  }

  @Put(":kind")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "site_notice.publish", resourceType: "visitor_policy_document" })
  publish(@Param("kind") kind: string, @Body() dto: PublishNoticeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.notices.publish(kindOf(kind), dto, user);
  }
}

@Controller("public")
export class PublicSiteNoticesController {
  constructor(private readonly notices: SiteNoticesService) {}

  @Public()
  @Get("emergency-info")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  emergency(@Query("site") siteId: string, @Query("ref") referenceId: string) {
    return this.notices.publicEmergency(siteId, referenceId);
  }

  @Public()
  @Get("induction")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  induction(@Query("site") siteId: string, @Query("ref") referenceId: string) {
    return this.notices.publicInduction(siteId, referenceId);
  }

  @Public()
  @Post("induction/acknowledge")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  acknowledge(@Body() dto: AcknowledgeInductionDto) {
    return this.notices.acknowledgeInduction(dto);
  }
}
