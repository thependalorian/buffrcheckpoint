import type { CimsoReservationRef } from "../cimso.types";

/**
 * Maps a CiMSO reservation into Checkpoint invitation-oriented fields.
 * AFTER_NDA: align field names with the official message catalogue.
 * Never invent passport/ID copy here — prefer opaque external IDs.
 */
export function reservationToInvitationDraft(reservation: CimsoReservationRef): {
  externalReservationId: string;
  guestDisplayName: string | null;
  roomCode: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  siteExternalId: string | null;
} {
  return {
    externalReservationId: reservation.externalReservationId,
    guestDisplayName: reservation.guestDisplayName?.trim() || null,
    roomCode: reservation.roomCode?.trim() || null,
    arrivalDate: reservation.arrivalDate ?? null,
    departureDate: reservation.departureDate ?? null,
    siteExternalId: reservation.siteExternalId ?? null,
  };
}
