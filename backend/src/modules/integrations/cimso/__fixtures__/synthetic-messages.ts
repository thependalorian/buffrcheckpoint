/**
 * Synthetic fixtures for unit tests — NOT CiMSO wire format.
 * Replace with anonymised samples from the NDA package when available.
 */

import type { CimsoFrontDeskEvent, CimsoReservationRef } from "../cimso.types";

export const FIXTURE_RESERVATION: CimsoReservationRef = {
  externalReservationId: "AFTER_NDA_RES_001",
  siteExternalId: "AFTER_NDA_SITE_DEMO",
  arrivalDate: "2026-10-01",
  departureDate: "2026-10-03",
  guestDisplayName: "Demo Guest",
  roomCode: "R12",
  raw: { note: "synthetic fixture — not CiMSO schema" },
};

export const FIXTURE_FRONT_DESK_CHECK_IN: CimsoFrontDeskEvent = {
  externalEventId: "AFTER_NDA_FD_001",
  eventType: "check_in",
  externalReservationId: "AFTER_NDA_RES_001",
  occurredAt: "2026-10-01T14:00:00.000Z",
  raw: { note: "synthetic fixture — not CiMSO schema" },
};
