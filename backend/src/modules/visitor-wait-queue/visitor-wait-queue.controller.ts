import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsIn } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { VisitorWaitQueueService } from "./visitor-wait-queue.service";

class TransitionQueueDto {
  @IsIn(["called", "completed", "cancelled"])
  statusCode!: "called" | "completed" | "cancelled";
}

@Controller("visitor-wait-queue")
export class VisitorWaitQueueController {
  constructor(private readonly queue: VisitorWaitQueueService) {}

  @Get()
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  list(@Query("siteId") siteId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.queue.listOpen(siteId, user);
  }

  @Post(":id/transition")
  @RequirePermission(PERMISSIONS.VISIT_CHECKOUT)
  @AuditLog({ action: "visitor_wait_queue.transition", resourceType: "visitor_wait_queue_entry" })
  transition(@Param("id") id: string, @Body() dto: TransitionQueueDto, @CurrentUser() user: AuthenticatedUser) {
    return this.queue.transition(id, dto.statusCode, user);
  }
}
