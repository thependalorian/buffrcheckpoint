import { Body, Controller, Get, Param, Post, Query, StreamableFile } from "@nestjs/common";
import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CheckInDto } from "./dto/check-in.dto";
import { VisitAccessDecisionDto } from "./dto/visit-access-decision.dto";
import { VisitsService } from "./visits.service";

class SignOutByPhoneBody {
  @IsUUID()
  siteId!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(40)
  visitorPhone!: string;
}

@Controller("visits")
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post("check-in")
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user: AuthenticatedUser) {
    return this.visitsService.checkIn(dto, user);
  }

  @Post("sign-out-by-phone")
  @RequirePermission(PERMISSIONS.VISIT_CHECKOUT)
  @AuditLog({ action: "visit.sign_out_by_phone", resourceType: "visit" })
  signOutByPhone(@Body() dto: SignOutByPhoneBody, @CurrentUser() user: AuthenticatedUser) {
    return this.visitsService.signOutByPhone(dto.siteId, dto.visitorPhone, user);
  }

  @Post(":id/check-out")
  @RequirePermission(PERMISSIONS.VISIT_CHECKOUT)
  @AuditLog({ action: "visit.check_out", resourceType: "visit" })
  checkOut(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visitsService.checkOut(id, user);
  }

  @Post(":id/approve")
  @RequirePermission(PERMISSIONS.HOST_APPROVE)
  @AuditLog({ action: "visit.access.approve", resourceType: "visit" })
  approve(@Param("id") id: string, @Body() dto: VisitAccessDecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.visitsService.approveAccess(id, dto.reason, user);
  }

  @Post(":id/reject")
  @RequirePermission(PERMISSIONS.HOST_APPROVE)
  @AuditLog({ action: "visit.access.reject", resourceType: "visit" })
  reject(@Param("id") id: string, @Body() dto: VisitAccessDecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.visitsService.rejectAccess(id, dto.reason, user);
  }

  @Get("site/:siteId/open")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  listOpenBySite(@Param("siteId") siteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visitsService.listOpenBySite(siteId, user);
  }

  // Display-ready roster (resolved codes, decrypted names) — backs the
  // admin app's front-desk/visitors/emergency tables. `open=false` returns
  // full visit history (checked-out included), scoped org-wide if siteId
  // is omitted.
  @Get("roster")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  listRoster(
    @Query("siteId") siteId: string | undefined,
    @Query("open") open: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.visitsService.listRoster(siteId ?? "", user, open !== "false");
  }

  // Date-range, paginated visit search — answers "who visited on date X"
  // without the roster endpoint's 200-row cap. Declared before ":id" so the
  // literal path wins.
  @Get("roster/search")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  searchRoster(
    @Query("siteId") siteId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("limit") limit: string | undefined,
    @Query("cursor") cursor: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.visitsService.searchRoster(user, {
      siteId,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get("roster/export")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  @AuditLog({ action: "visit.roster.export", resourceType: "visit" })
  async exportRoster(
    @Query("siteId") siteId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const csv = await this.visitsService.exportRosterCsv(user, { siteId, from, to });
    return new StreamableFile(Buffer.from(csv, "utf8"), {
      type: "text/csv",
      disposition: `attachment; filename="visitor-roster.csv"`,
    });
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  @AuditLog({ action: "visit.read", resourceType: "visit" })
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visitsService.getById(id, user);
  }
}
