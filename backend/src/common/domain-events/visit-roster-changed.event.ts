// Emitted after any write that changes who is on site or what state they are
// in: check-in, check-out, approve/reject, escalation status moves, and
// emergency trigger/resolve. VisitsController's roster stream relays it to
// open front-desk and emergency screens, which then re-fetch the roster.
//
// Ids only, never personal data: the stream is a "something changed" signal,
// and the re-fetch goes through the normal permission-checked roster read.
//
// The emitter is in-process, so this reaches clients connected to the same
// backend instance. Railway runs one instance today (railway.toml sets no
// replicas); scaling out needs a shared bus (e.g. Postgres LISTEN/NOTIFY).
export type VisitRosterChangeReason =
  | "checked_in"
  | "checked_out"
  | "approved"
  | "rejected"
  | "escalated"
  | "emergency_triggered"
  | "emergency_resolved";

export class VisitRosterChangedEvent {
  constructor(
    public readonly organisationId: string,
    public readonly siteId: string,
    public readonly visitId: string | null,
    public readonly reason: VisitRosterChangeReason,
  ) {}
}

export const VISIT_ROSTER_CHANGED_EVENT = "visit.roster_changed";
