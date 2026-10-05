import { Injectable } from "@nestjs/common";

import type { CimsoReservationRef } from "../cimso.types";
import { CimsoInnterchangeClient } from "../cimso-innterchange.client";
import { reservationToInvitationDraft } from "../mappers/reservation-to-invitation";

/** Interface type 3 — lodging reservations. */
@Injectable()
export class CimsoReservationsAdapter {
  constructor(private readonly client: CimsoInnterchangeClient) {}

  async syncWindow(params: { siteExternalId?: string; fromIso?: string; toIso?: string }): Promise<{
    afterNdaRequired: boolean;
    invitations: ReturnType<typeof reservationToInvitationDraft>[];
    reservations: CimsoReservationRef[];
  }> {
    if (!this.client.isReady()) {
      return { afterNdaRequired: true, invitations: [], reservations: [] };
    }
    const reservations = await this.client.fetchReservations(params);
    return {
      afterNdaRequired: false,
      reservations,
      invitations: reservations.map(reservationToInvitationDraft),
    };
  }
}
