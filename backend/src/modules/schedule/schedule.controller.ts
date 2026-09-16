import { Controller, Get, Query } from "@nestjs/common";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { InvitationsService } from "../invitations/invitations.service";

// Backs the admin app's Schedule screen ("Replace the Calendar Demo"
// section — CheckpointScheduleEvent, GET /schedule?siteId=&from=&to=).
// Release 1 scope is pre-registered-visitor arrivals only
// (visit_invitation); credential-expiry/induction-expiry/control-review
// event types described alongside it are a Release 1.5+ gap, not built
// here.
@Controller("schedule")
export class ScheduleController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  async list(
    @Query("siteId") siteId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const invitations = await this.invitationsService.listUpcoming(user, siteId, from, to);

    return invitations.map((invitation) => ({
      id: invitation.id,
      title: `Expected visitor: ${invitation.visitorReference}`,
      startsAt: invitation.expectedFrom,
      endsAt: invitation.expectedUntil,
      allDay: false,
      typeCode: "pre_registered_arrival",
      siteId: invitation.siteId,
      zoneId: null,
      statusCode: invitation.statusCode,
      accessScope: "operational" as const,
    }));
  }
}
