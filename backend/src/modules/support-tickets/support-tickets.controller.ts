import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { type CreateTicketInput, SupportTicketsService } from "./support-tickets.service";

@Controller("platform/tickets")
export class SupportTicketsController {
  constructor(private readonly service: SupportTicketsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PLATFORM_TICKET_MANAGE)
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermission(PERMISSIONS.PLATFORM_TICKET_MANAGE)
  @AuditLog({ action: "support_ticket.create", resourceType: "support_ticket" })
  create(@Body() dto: CreateTicketInput, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  // Declared before ":ticketId/status" so the literal path wins; multi-select
  // status change from the queue view.
  @Patch("bulk-status")
  @RequirePermission(PERMISSIONS.PLATFORM_TICKET_MANAGE)
  @AuditLog({ action: "support_ticket.update_status_bulk", resourceType: "support_ticket" })
  updateStatusBulk(
    @Body() body: { ticketIds: string[]; statusCode: string; note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatusBulk(body.ticketIds ?? [], body.statusCode, user, body.note);
  }

  @Get(":ticketId")
  @RequirePermission(PERMISSIONS.PLATFORM_TICKET_MANAGE)
  getById(@Param("ticketId") ticketId: string) {
    return this.service.getById(ticketId);
  }

  @Patch(":ticketId/status")
  @RequirePermission(PERMISSIONS.PLATFORM_TICKET_MANAGE)
  @AuditLog({ action: "support_ticket.update_status", resourceType: "support_ticket" })
  updateStatus(
    @Param("ticketId") ticketId: string,
    @Body() body: { statusCode: string; note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(ticketId, body.statusCode, user, body.note);
  }

  @Post(":ticketId/comments")
  @RequirePermission(PERMISSIONS.PLATFORM_TICKET_MANAGE)
  addComment(
    @Param("ticketId") ticketId: string,
    @Body() body: { body: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.addComment(ticketId, body.body, user);
  }

  @Get(":ticketId/comments")
  @RequirePermission(PERMISSIONS.PLATFORM_TICKET_MANAGE)
  listComments(@Param("ticketId") ticketId: string) {
    return this.service.listComments(ticketId);
  }
}
