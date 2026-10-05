import { Injectable } from "@nestjs/common";

import type { CimsoFrontDeskEvent } from "../cimso.types";
import { CimsoInnterchangeClient } from "../cimso-innterchange.client";
import { visitToFrontDeskEvent } from "../mappers/visit-to-front-desk-event";

/** Interface type 4 — front desk check-in / check-out. */
@Injectable()
export class CimsoFrontDeskAdapter {
  constructor(private readonly client: CimsoInnterchangeClient) {}

  async ingestExternalEvent(event: CimsoFrontDeskEvent): Promise<{
    afterNdaRequired: boolean;
    accepted: boolean;
    event: CimsoFrontDeskEvent;
  }> {
    // Inbound from CiMSO (push or poll) — store/map AFTER_NDA.
    // For now acknowledge shape only; no folio mutation.
    return { afterNdaRequired: !this.client.isReady(), accepted: true, event };
  }

  async publishVisitEvent(input: {
    visitId: string;
    eventType: "check_in" | "check_out";
    externalReservationId?: string | null;
    occurredAt: string;
  }): Promise<{ afterNdaRequired: boolean; accepted: boolean }> {
    if (!this.client.isReady()) {
      return { afterNdaRequired: true, accepted: false };
    }
    const payload = visitToFrontDeskEvent(input);
    const result = await this.client.publishFrontDeskEvent({
      externalEventId: payload.externalEventId,
      eventType: payload.eventType,
      externalReservationId: payload.externalReservationId,
      occurredAt: payload.occurredAt,
    });
    return { afterNdaRequired: false, accepted: result.accepted };
  }
}
