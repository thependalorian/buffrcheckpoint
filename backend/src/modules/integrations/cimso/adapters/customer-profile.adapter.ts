import { Injectable } from "@nestjs/common";

import { CimsoInnterchangeClient } from "../cimso-innterchange.client";

/** Interface type 1 — customer data platform (profiles / membership). AFTER_NDA. */
@Injectable()
export class CimsoCustomerProfileAdapter {
  constructor(private readonly client: CimsoInnterchangeClient) {}

  async syncProfiles(_params: {
    siteExternalId?: string;
    sinceIso?: string;
  }): Promise<{
    afterNdaRequired: boolean;
    profilesSeen: number;
  }> {
    if (!this.client.isReady()) {
      return { afterNdaRequired: true, profilesSeen: 0 };
    }
    // AFTER_NDA: call real INNterchange customer-data messages; map with PII minimisation.
    return { afterNdaRequired: false, profilesSeen: 0 };
  }
}
