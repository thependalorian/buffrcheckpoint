import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import {
  VISITOR_CHECKED_IN_EVENT,
  VISITOR_CHECKED_OUT_EVENT,
  VisitorCheckedInEvent,
  VisitorCheckedOutEvent,
} from "../../common/domain-events/visitor-email.events";
import { TemplatedEmailService } from "./templated-email.service";
import { deliverableEmail, formatDuration, formatWhen, visitReference } from "./visitor-email";

@Injectable()
export class VisitorEmailListener {
  private readonly logger = new Logger(VisitorEmailListener.name);

  constructor(private readonly templatedEmail: TemplatedEmailService) {}

  @OnEvent(VISITOR_CHECKED_IN_EVENT)
  async onCheckedIn(event: VisitorCheckedInEvent) {
    const to = deliverableEmail(event.email);
    if (!to) return;
    const reference = visitReference(event.visitId);
    const checkedInAt = formatWhen(event.checkedInAt);
    await this.templatedEmail
      .send({
        templateCode: "visitor_visit_receipt",
        organisationId: event.organisationId,
        to,
        visitId: event.visitId,
        recipientName: event.visitorName,
        variables: {
          siteName: event.siteName,
          hostName: event.hostName,
          checkedInAt,
          visitReference: reference,
          signOutUrl: event.signOutUrl,
        },
        fallback: {
          subject: `Your visit to ${event.siteName}`,
          body: `Thank you for checking in.\n\nSite: ${event.siteName}\nVisiting: ${event.hostName}\nChecked in: ${checkedInAt}\nReference: ${reference}\n\nWhen you leave, sign out here:\n${event.signOutUrl}\n\nYou are receiving this because you gave this address when you checked in. It is not used for anything else.`,
        },
      })
      .catch((error) =>
        this.logger.warn(`Visit receipt not queued: ${error instanceof Error ? error.message : String(error)}`),
      );
  }

  @OnEvent(VISITOR_CHECKED_OUT_EVENT)
  async onCheckedOut(event: VisitorCheckedOutEvent) {
    const to = deliverableEmail(event.email);
    if (!to) return;
    const checkedInAt = formatWhen(event.checkedInAt);
    const checkedOutAt = formatWhen(event.checkedOutAt);
    const duration = formatDuration(event.checkedInAt, event.checkedOutAt);
    await this.templatedEmail
      .send({
        templateCode: "visitor_signout_thanks",
        organisationId: event.organisationId,
        to,
        visitId: event.visitId,
        recipientName: event.visitorName,
        variables: { siteName: event.siteName, checkedInAt, checkedOutAt, duration, ratingUrl: event.ratingUrl },
        fallback: {
          subject: `Thank you for visiting ${event.siteName}`,
          body: `Thank you for visiting ${event.siteName}.\n\nChecked in: ${checkedInAt}\nChecked out: ${checkedOutAt}\nTime on site: ${duration}\n\nHow was your visit? Rate it in one tap:\n${event.ratingUrl}\n\nYou are receiving this because you gave this address when you checked in. It is not used for anything else.`,
        },
      })
      .catch((error) =>
        this.logger.warn(`Sign-out thanks not queued: ${error instanceof Error ? error.message : String(error)}`),
      );
  }
}
