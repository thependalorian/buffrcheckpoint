import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import {
  VISITOR_CHECKED_IN_EVENT,
  VISITOR_CHECKED_OUT_EVENT,
  VisitorCheckedInEvent,
  VisitorCheckedOutEvent,
} from "../../common/domain-events/visitor-email.events";
import { SMS_CODES } from "./sms-template-catalog";
import { TemplatedSmsService } from "./templated-sms.service";
import { visitReference } from "./visitor-email";

/**
 * Texts to a visitor who typed a mobile number, mirroring the email listener. The messages are neutral (organisation name, reference and
 * a link only; see sms-template-catalog.ts). Whether anything is actually sent is decided downstream: the organisation's switch, its SMS
 * add-on, the safety limit and the provider arrangement, and each text is billed to the organisation by use. With none of those in place this listener does nothing visible.
 */
@Injectable()
export class VisitorSmsListener {
  private readonly logger = new Logger(VisitorSmsListener.name);

  constructor(private readonly sms: TemplatedSmsService) {}

  @OnEvent(VISITOR_CHECKED_IN_EVENT)
  async onCheckedIn(event: VisitorCheckedInEvent) {
    if (!event.phone || !event.organisationName || !event.smsSignOutUrl) return;
    await this.sms
      .send({
        templateCode: SMS_CODES.visitReceipt,
        organisationId: event.organisationId,
        to: event.phone,
        visitId: event.visitId,
        variables: {
          organisationName: event.organisationName,
          visitReference: visitReference(event.visitId),
          signOutUrl: event.smsSignOutUrl,
        },
      })
      .catch((error) =>
        this.logger.warn(`Visit text not queued: ${error instanceof Error ? error.message : String(error)}`),
      );
  }

  @OnEvent(VISITOR_CHECKED_OUT_EVENT)
  async onCheckedOut(event: VisitorCheckedOutEvent) {
    if (!event.phone || !event.organisationName || !event.smsRatingUrl) return;
    await this.sms
      .send({
        templateCode: SMS_CODES.signOutThanks,
        organisationId: event.organisationId,
        to: event.phone,
        visitId: event.visitId,
        variables: { organisationName: event.organisationName, ratingUrl: event.smsRatingUrl },
      })
      .catch((error) =>
        this.logger.warn(`Sign-out text not queued: ${error instanceof Error ? error.message : String(error)}`),
      );
  }
}
