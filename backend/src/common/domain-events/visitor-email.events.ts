// Raised after a visit is checked in or out, carrying what the visitor-facing email or text needs. The email address and mobile number are
// only present when the visitor typed them at check-in (an empty string means none); each listener sends nothing when its address is
// absent or the organisation has switched that message off. A text additionally needs the organisation's SMS add-on.
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
    /** Mobile number the visitor typed, or null. Used only by the text-message listener. */
    public readonly phone: string | null = null,
    public readonly organisationName: string | null = null,
    /** The 41-character form of the sign-out link, short enough for one text message. */
    public readonly smsSignOutUrl: string | null = null,
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
    public readonly phone: string | null = null,
    public readonly organisationName: string | null = null,
    /** The 41-character form of the rating link, short enough for one text message. */
    public readonly smsRatingUrl: string | null = null,
  ) {}
}

export const VISITOR_CHECKED_IN_EVENT = "visitor.checked_in";
export const VISITOR_CHECKED_OUT_EVENT = "visitor.checked_out";
