/**
 * Maps a Checkpoint visit lifecycle event toward a CiMSO front-desk payload.
 * AFTER_NDA: replace with real INNterchange front-desk message fields.
 */
export function visitToFrontDeskEvent(input: {
  visitId: string;
  eventType: "check_in" | "check_out";
  externalReservationId?: string | null;
  occurredAt: string;
}): {
  externalEventId: string;
  eventType: "check_in" | "check_out";
  externalReservationId?: string;
  occurredAt: string;
  checkpointVisitId: string;
} {
  return {
    externalEventId: `bc_${input.visitId}_${input.eventType}`,
    eventType: input.eventType,
    externalReservationId: input.externalReservationId ?? undefined,
    occurredAt: input.occurredAt,
    checkpointVisitId: input.visitId,
  };
}
