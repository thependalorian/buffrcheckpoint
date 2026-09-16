import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { SupportTicketsService } from "./support-tickets.service";

// Customer-facing half of support tickets — organisationId is always the
// caller's own, never client-supplied (never trust it, per every other
// controller in this codebase). Gated on support_ticket.customer.manage
// (migration 0029), not the broad visit.history.read these routes borrowed
// when they were first added: opening a ticket and reading staff replies is a
// support conversation, and every read-only reporting role held that
// permission.
@Controller("tickets")
export class SupportTicketsCustomerController {
  constructor(private readonly service: SupportTicketsService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SUPPORT_TICKET_CUSTOMER_MANAGE)
  create(
    @Body() dto: { subject: string; description?: string; severityCode: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create({ ...dto, organisationId: user.organisationId }, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SUPPORT_TICKET_CUSTOMER_MANAGE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listForOrganisation(user.organisationId);
  }

  @Get(":ticketId")
  @RequirePermission(PERMISSIONS.SUPPORT_TICKET_CUSTOMER_MANAGE)
  getById(@Param("ticketId") ticketId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.assertOwnedByOrganisation(ticketId, user.organisationId);
  }

  @Post(":ticketId/comments")
  @RequirePermission(PERMISSIONS.SUPPORT_TICKET_CUSTOMER_MANAGE)
  async addComment(
    @Param("ticketId") ticketId: string,
    @Body() body: { body: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.assertOwnedByOrganisation(ticketId, user.organisationId);
    return this.service.addComment(ticketId, body.body, user);
  }

  @Get(":ticketId/comments")
  @RequirePermission(PERMISSIONS.SUPPORT_TICKET_CUSTOMER_MANAGE)
  async listComments(@Param("ticketId") ticketId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.service.assertOwnedByOrganisation(ticketId, user.organisationId);
    return this.service.listComments(ticketId);
  }
}
