import { Injectable, ServiceUnavailableException } from "@nestjs/common";

import { type CimsoConfig, getCimsoConfig } from "./cimso.config";
import {
  CIMSO_BOOKING_STATUS,
  CIMSO_MESSAGE_TYPE,
  type CimsoFrontDeskEvent,
  type CimsoReservationRef,
} from "./cimso.types";

/**
 * Transport for CiMSO INNterchange.
 * Spec (June 2026): TCP binary header (32 bytes LE) + JSON payload;
 * handshake 4 then 5; business messages e.g. 1101/1107/2001.
 *
 * Framing + live socket I/O land next; until HOST/PORT/LOGIN are set,
 * methods fail closed.
 */
@Injectable()
export class CimsoInnterchangeClient {
  getConfig(): CimsoConfig {
    return getCimsoConfig();
  }

  isReady(): boolean {
    return this.getConfig().transportConfigured;
  }

  assertReady(): void {
    if (!this.isReady()) {
      throw new ServiceUnavailableException({
        code: "CIMSO_PROPERTY_CREDENTIALS_REQUIRED",
        message:
          "CiMSO INNterchange TCP credentials are not configured. Set CIMSO_INNTERCHANGE_HOST, PORT, CLIENT_LOGIN_ID, and CLIENT_PASSWORD (TLS recommended over Internet). Spec digest: docs/cimso-innterchange/NDA_PACKAGE_NOTES.md",
      });
    }
  }

  /**
   * Get Bookings Request (1101) for an arrival/departure window.
   * Not built: the TCP frame and JSON filters (Arrival From/Until Day, statuses) wait on the vendor NDA package and test credentials.
   */
  async fetchReservations(_params: {
    siteExternalId?: string;
    fromIso?: string;
    toIso?: string;
  }): Promise<CimsoReservationRef[]> {
    this.assertReady();
    throw new ServiceUnavailableException({
      code: "CIMSO_TCP_CLIENT_NOT_IMPLEMENTED",
      message: "Message catalogue known (1101 Get Bookings). TCP framing/handshake client not implemented yet.",
      messageTypeId: CIMSO_MESSAGE_TYPE.GET_BOOKINGS_REQUEST,
    });
  }

  /**
   * Set Booking Status Request (1107) — e.g. Active (A) check-in, Left (L) departure.
   * Not built: follows the TCP framing above, so it waits on the same vendor package and credentials.
   */
  async publishFrontDeskEvent(event: CimsoFrontDeskEvent): Promise<{ accepted: boolean }> {
    this.assertReady();
    const status =
      event.bookingStatus ??
      (event.eventType === "check_in"
        ? CIMSO_BOOKING_STATUS.ACTIVE
        : event.eventType === "check_out"
          ? CIMSO_BOOKING_STATUS.LEFT
          : undefined);
    throw new ServiceUnavailableException({
      code: "CIMSO_TCP_CLIENT_NOT_IMPLEMENTED",
      message: "Message catalogue known (1107 Set Booking Status). TCP framing/handshake client not implemented yet.",
      messageTypeId: CIMSO_MESSAGE_TYPE.SET_BOOKING_STATUS_REQUEST,
      intendedBookingStatus: status,
      bookingId: event.externalReservationId,
    });
  }
}
