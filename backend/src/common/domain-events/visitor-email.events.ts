// Raised after a visit is checked in or out, carrying what the visitor-facing email needs. The email address is only present when the
// visitor typed one at check-in; the listener sends nothing when it is absent or the organisation has switched the email off.
export class VisitorCheckedInEvent {
  constructor(
    public readonly visitId: string,
    public readonly organisationId: string,
    public readonly email: string,
    public readonly visitorName: string | null,
    public readonly siteName: string,
    public readonly hostName: string,
    public readonly checkedInAt: Date,
    /** Personal link that signs this visit out. */
    public readonly signOutUrl: string,
  ) {}
}

export class VisitorCheckedOutEvent {
  constructor(
    public readonly visitId: string,
    public readonly organisationId: string,
    public readonly email: string,
    public readonly visitorName: string | null,
    public readonly siteName: string,
    public readonly checkedInAt: Date,
    public readonly checkedOutAt: Date,
    /** Signed link to rate the visit. */
    public readonly ratingUrl: string,
  ) {}
}

export const VISITOR_CHECKED_IN_EVENT = "visitor.checked_in";
export const VISITOR_CHECKED_OUT_EVENT = "visitor.checked_out";
