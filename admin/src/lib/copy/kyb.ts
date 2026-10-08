// Copy for business verification (KYB): uploading the founding statement and other documents, pre-filled details, and what the reviewer
// asks for. Plain language for the person who owns the organisation, no regulator jargon.

export const MAX_UPLOAD_BYTES = Math.floor(4.4 * 1024 * 1024);

export const kybCopy = {
  title: "Business Verification",
  description:
    "Upload your registration documents and we fill in the details for you to check. Once a person at Buffr Checkpoint confirms them, billing and go-live are unlocked.",
  steps: {
    documents: "1. Your documents",
    details: "2. Check your details",
    submit: "3. Send for review",
  },
  documents: {
    heading: "Registration documents",
    help: "Start with your founding statement (CC1) or amended founding statement (CC2). We read it and fill in the details below. Add anything else that supports your registration.",
    typeLabel: "Type of document",
    fileLabel: "File",
    fileHelp: "PDF, PNG or JPEG, up to 4.4 MB.",
    upload: "Upload",
    uploading: "Uploading",
    reading: "Reading your document",
    readOk: "Details read from this document",
    readNone: "We could not read details from this document. Type them in below.",
    useDetails: "Use these details",
    remove: "Remove",
    empty: "No documents yet.",
    tooLarge:
      "That file is larger than 4.4 MB. Scan it at a lower quality or save a compressed copy, then upload it again.",
    wrongType: "Only PDF, PNG and JPEG files can be uploaded.",
    statusAccepted: "Accepted",
    statusRejected: "Needs replacing",
    statusReceived: "Received",
  },
  details: {
    heading: "Business details",
    entityType: "Type of business",
    entityTypePlaceholder: "Choose one",
    registrationNumber: "Registration number",
    registrationHelp: "For example CC/2024/09322 for a close corporation.",
    businessName: "Registered business name",
    businessNameHelp: "Exactly as it appears on the registration document.",
    registeredAddress: "Registered office address",
    registeredAddressHelp: "A street address, not a post office box.",
    signatory: "Person authorised to act for the business",
    signatoryHelp: "First name and surname.",
    principalBusiness: "What the business does",
    financialYearEnd: "Financial year end",
    postalAddress: "Postal address",
    contactEmail: "Business email",
    contactPhone: "Business phone",
    tin: "Tax number (optional)",
    incorporatedOn: "Date registered (optional)",
    incorporatedOnHelp: "Year-month-day, for example 2024-10-28.",
    members: "Members and ownership",
    membersHelp: "Each member's name and share. Add the identity number only if you want it on file.",
    memberName: "Full name",
    memberRole: "Role",
    memberJuristic: "This is a company or corporation",
    memberRegistration: "Its registration number",
    memberPercentage: "Share (%)",
    memberId: "Identity number (optional)",
    addMember: "Add a member",
    removeMember: "Remove",
  },
  badges: {
    fromDocument: "From your document: please check",
    lowConfidence: "Hard to read: please check carefully",
    edited: "Edited by you",
    flagged: "Our reviewer asked about this",
  },
  submit: {
    send: "Send for review",
    resend: "Send the corrected details",
    sending: "Sending",
    fixFirst: "Fix the highlighted details first.",
    needDocument: "Upload your founding statement or registration certificate first.",
  },
  status: {
    none: "Not started",
    pending: "With our team for review",
    needsInfo: "We need a little more from you",
    verified: "Verified",
    rejected: "Not approved",
    superseded: "Replaced by a newer submission",
    pendingBody:
      "You do not need to do anything. You will get an email when it is decided. You can still correct a detail or add a document below; that sends a new version to the same reviewer.",
    verifiedBody: "Your business is verified. Billing activation and go-live are no longer held up by this step.",
    editAndResend: "Correct details or add documents",
  },
  checklist: {
    heading: "What we will need",
    help: "The first item is required. The others are asked for when your ownership calls for them, so you can send them now and avoid a second round.",
    required: "Required",
    asked: "Requested",
    done: "On file",
    missing: "Not yet",
  },
  reviewer: {
    heading: "What our reviewer asked",
    fields: "Details to correct",
  },
} as const;

export const fieldLabels: Record<string, string> = {
  entityType: kybCopy.details.entityType,
  businessRegistrationNumber: kybCopy.details.registrationNumber,
  registeredBusinessName: kybCopy.details.businessName,
  registeredAddress: kybCopy.details.registeredAddress,
  authorizedSignatoryName: kybCopy.details.signatory,
  principalBusiness: kybCopy.details.principalBusiness,
  financialYearEnd: kybCopy.details.financialYearEnd,
  postalAddress: kybCopy.details.postalAddress,
  contactEmail: kybCopy.details.contactEmail,
  contactPhone: kybCopy.details.contactPhone,
  tin: kybCopy.details.tin,
  incorporatedOn: kybCopy.details.incorporatedOn,
  members: kybCopy.details.members,
  documents: kybCopy.documents.heading,
};

export function statusText(code: string | null | undefined): string {
  switch (code) {
    case "pending":
      return kybCopy.status.pending;
    case "needs_info":
      return kybCopy.status.needsInfo;
    case "verified":
      return kybCopy.status.verified;
    case "rejected":
      return kybCopy.status.rejected;
    case "superseded":
      return kybCopy.status.superseded;
    default:
      return kybCopy.status.none;
  }
}

/** Checks a chosen file before it is sent: the browser's own limits come first so the person gets a clear message. */
export function checkUpload(file: { size: number; type: string }): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return kybCopy.documents.tooLarge;
  if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) return kybCopy.documents.wrongType;
  return null;
}

export function sourceBadge(source: string | undefined, confidence: string | undefined): string | null {
  if (source === "edited") return kybCopy.badges.edited;
  if (source === "document")
    return confidence === "low" || confidence === "medium" ? kybCopy.badges.lowConfidence : kybCopy.badges.fromDocument;
  return null;
}
