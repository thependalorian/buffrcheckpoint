import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { VISIT_CHECKED_IN_EVENT, VisitCheckedInEvent } from "../../common/domain-events/visit-checked-in.event";
import { NotificationsService } from "./notifications.service";

const SYSTEM_USER: Omit<AuthenticatedUser, "organisationId"> = {
  userId: "00000000-0000-0000-0000-000000000001",
  siteId: null,
  roleCode: "system",
  permissions: [],
  emailVerified: true,
  mfaEnabled: true,
};

@Injectable()
export class VisitCheckedInListener {
  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(VISIT_CHECKED_IN_EVENT)
  async handleVisitCheckedIn(event: VisitCheckedInEvent) {
    await this.notifications
      .send(
        {
          visitId: event.visitId,
          channelCode: "email",
          recipientReference: event.recipientReference,
          subject: event.subject,
          message: event.message,
          html: event.html,
        },
        { ...SYSTEM_USER, organisationId: event.organisationId },
      )
      .catch(() => undefined);
  }
}
