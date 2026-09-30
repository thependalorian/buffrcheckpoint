import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { VISIT_CHECKED_IN_EVENT, VisitCheckedInEvent } from "../../common/domain-events/visit-checked-in.event";
import { TemplatedEmailService } from "./templated-email.service";

@Injectable()
export class VisitCheckedInListener {
  constructor(private readonly templatedEmail: TemplatedEmailService) {}

  @OnEvent(VISIT_CHECKED_IN_EVENT)
  async handleVisitCheckedIn(event: VisitCheckedInEvent) {
    await this.templatedEmail.send({
      templateCode: "host_visitor_arrived",
      organisationId: event.organisationId,
      to: event.recipientReference,
      visitId: event.visitId,
      variables: {
        visitorName: event.visitorName,
        siteLabel: event.siteLabel,
        detailBlock: event.detailBlock,
      },
      fallback: {
        subject: event.subject,
        body: event.message,
      },
      customHtml: event.html,
    });
  }
}
