// Emitted after a host-contact check-in write commits. VisitsService already
// owns the decryption (hostContact) and composition context (queue position,
// branding, purpose/visitor-type labels) needed to build the notification —
// that stays there rather than making the notifications module reach back
// into visits/sites/data-protection to re-derive it. This event carries the
// already-composed payload so NotificationsService only owns "how to send."
export class VisitCheckedInEvent {
  constructor(
    public readonly visitId: string,
    public readonly organisationId: string,
    public readonly recipientReference: string,
    public readonly subject: string,
    public readonly message: string,
    public readonly html: string,
  ) {}
}

export const VISIT_CHECKED_IN_EVENT = "visit.checked_in";
