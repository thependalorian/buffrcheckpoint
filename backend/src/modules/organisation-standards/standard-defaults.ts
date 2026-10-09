/**
 * Checkpoint's standard setup for a new organisation, taken from the blueprint rather than chosen ad hoc:
 *  - the check-in form follows §8.2 (field classes: core and basic fields by default; high-risk data such as ID numbers off by
 *    default) and §8.1 (General visitor: name, host, purpose category);
 *  - the visitor privacy notice follows the commitments of the public Privacy Policy (organisation is controller, Buffr Checkpoint is
 *    processor; what is collected; how it is used; retention; security; rights) and the "practical legal position" (designed to
 *    support privacy and retention controls, which Checkpoint runs for the client; no compliance claims);
 *  - retention uses the "Standard" tier of §8.5. The blueprint gives no day count, so the number is a platform setting with the
 *    placeholder below, to be confirmed by the owner and counsel.
 * An organisation accepts all of this as it stands or edits it, now or at go-live. Pure functions, so the content is testable.
 */

/** PLACEHOLDER for the owner and counsel to confirm: one annual review cycle, then disposal. Override with the setting `organisation_defaults`. */
export const STANDARD_RETENTION_DAYS = 365;
export const MIN_RETENTION_DAYS = 1;
export const MAX_RETENTION_DAYS = 3650;

export const PRIVACY_NOTICE_POLICY_CODE = "privacy_notice";
export const PRIVACY_NOTICE_NAME = "Visitor privacy notice";
export const PRIVACY_NOTICE_LANGUAGE = "en";

export const STANDARD_SITE_NAME = "Main reception";
export const STANDARD_HOST_NAME = "Reception";
export const STANDARD_HOST_DEPARTMENT = "Front desk";
export const STANDARD_QR_LABEL = "Main reception check-in";

export const STANDARD_FORM_NAME = "General visitor check-in";
export const STANDARD_VISITOR_TYPE = "general";

export interface StandardFormField {
  fieldCode: string;
  fieldLabel: string;
  fieldTypeCode: "text" | "phone" | "email" | "single_choice";
  /** Section 5.1 class. High-risk and verification-evidence fields are deliberately absent. */
  dataClassificationCode: "core" | "basic" | "sensitive";
  required: boolean;
  displayOrder: number;
  helpText?: string;
  /** Why the form asks for this field (PR-2). Every standard field states one. */
  purposeNote: string;
  visibilityRule?: Record<string, unknown>;
  validationSchema?: Record<string, unknown>;
}

const VEHICLE_RULE = { op: "and", conditions: [{ fieldCode: "purpose_category", equals: "vehicle" }] };

export const STANDARD_FORM_FIELDS: readonly StandardFormField[] = [
  {
    fieldCode: "visitor_name",
    fieldLabel: "Full name",
    fieldTypeCode: "text",
    dataClassificationCode: "core",
    required: true,
    displayOrder: 1,
    purposeNote: "Records who is on site and lets the host and the front desk recognise the visitor.",
  },
  {
    fieldCode: "visitor_phone",
    fieldLabel: "Mobile number",
    fieldTypeCode: "phone",
    dataClassificationCode: "core",
    required: true,
    displayOrder: 2,
    purposeNote:
      "Lets the host or the front desk reach the visitor during the visit and confirms the person is contactable in an emergency.",
  },
  {
    fieldCode: "company_name",
    fieldLabel: "Organisation or company",
    fieldTypeCode: "text",
    dataClassificationCode: "basic",
    required: false,
    displayOrder: 3,
    purposeNote: "Tells the host which organisation the visitor represents so the visit can be matched to the booking.",
  },
  {
    fieldCode: "visitor_email",
    fieldLabel: "Email (optional)",
    fieldTypeCode: "email",
    dataClassificationCode: "basic",
    required: false,
    displayOrder: 4,
    purposeNote: "Optional address for the visit receipt and for the sign-out link when no mobile number is used.",
  },
  {
    fieldCode: "host",
    fieldLabel: "Who are you visiting",
    fieldTypeCode: "text",
    dataClassificationCode: "core",
    required: true,
    displayOrder: 5,
    purposeNote: "Routes the arrival to the person being visited and lets the host be notified.",
  },
  {
    fieldCode: "purpose_category",
    fieldLabel: "Purpose of visit",
    fieldTypeCode: "single_choice",
    dataClassificationCode: "basic",
    required: true,
    displayOrder: 6,
    purposeNote:
      "Tells the front desk what kind of visit this is so the visitor is directed correctly and the right checks apply.",
    validationSchema: { options: ["meeting", "delivery", "interview", "vehicle", "other"] },
  },
  {
    fieldCode: "vehicle_registration",
    fieldLabel: "Vehicle registration",
    fieldTypeCode: "text",
    dataClassificationCode: "sensitive",
    required: false,
    displayOrder: 7,
    purposeNote:
      "Matches the vehicle to the visit at the gate and during an evacuation. Asked only when the visit involves a vehicle.",
    helpText: "Only asked when your visit involves a vehicle",
    visibilityRule: VEHICLE_RULE,
    validationSchema: { requiredIf: VEHICLE_RULE },
  },
];

/**
 * Sectors where the fact of a visit can reveal special-category information (draft Data Protection Bill s7): a clinic visit can reveal
 * health, a faith-based organisation can reveal religious belief, a community organisation can reveal political or other beliefs. For
 * these the purpose of the visit is classed as sensitive, so it is restricted by default, and the notice says so.
 */
export const SPECIAL_CATEGORY_SECTORS: readonly string[] = ["healthcare", "religious_faith_based", "ngo_nonprofit"];

export function isSpecialCategorySector(sectorCode: string | null | undefined): boolean {
  return !!sectorCode && SPECIAL_CATEGORY_SECTORS.includes(sectorCode);
}

/** The standard form for a sector. Only the classification of the purpose field differs; no field is added or removed. */
export function standardFormFieldsFor(sectorCode: string | null | undefined): readonly StandardFormField[] {
  if (!isSpecialCategorySector(sectorCode)) return STANDARD_FORM_FIELDS;
  return STANDARD_FORM_FIELDS.map((field) =>
    field.fieldCode === "purpose_category" ? { ...field, dataClassificationCode: "sensitive" as const } : field,
  );
}

/** Classes that need compliance approval before they may be published; the standard form must never contain one. */
export const HIGH_RISK_CLASSES = ["high_risk", "verification_evidence"] as const;

export function isValidRetentionDays(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= MIN_RETENTION_DAYS && value <= MAX_RETENTION_DAYS
  );
}

/** "365 days" or "1 day". */
export function describeDays(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

/** What a visitor is told is collected: the labels of the form's fields, with the conditional vehicle field described honestly. */
function collectedList(fields: readonly StandardFormField[]): string[] {
  return fields.map((field) => {
    if (field.visibilityRule && Object.keys(field.visibilityRule).length > 0) {
      return `${field.fieldLabel}, only when your visit involves a vehicle`;
    }
    return field.fieldLabel.replace(/\s*\(optional\)$/i, " (optional)");
  });
}

/**
 * The standard visitor privacy notice. It states only what the product does: records are encrypted, access is by role, access is
 * logged, retention follows the configured period, and the organisation is the controller. It makes no compliance claim.
 */
export function standardPrivacyNotice(input: {
  organisationName: string;
  retentionDays: number;
  fields?: readonly StandardFormField[];
  sectorCode?: string | null;
}): string {
  const name = input.organisationName.trim() || "This organisation";
  const collected = collectedList(input.fields ?? STANDARD_FORM_FIELDS);
  return [
    "Visitor privacy notice",
    "",
    "Who is responsible",
    `${name} is responsible for the information collected when you sign in. Buffr Checkpoint, the visitor check-in service ${name} uses, handles it on ${name}'s behalf and only on its instructions.`,
    "",
    "What we collect",
    `When you check in we collect only what is needed for your visit: ${collected.join("; ")}. We also record when you arrive and leave and how you checked in.`,
    "We do not ask for ID numbers, photographs, health information or biometric data unless the organisation has documented a need for them.",
    ...(isSpecialCategorySector(input.sectorCode)
      ? [
          `Because the fact that you visited ${name} can say something sensitive about you, such as your health or beliefs, the purpose of your visit is treated as sensitive information. It is shown only to the people who need it, and you can choose a general purpose where one fits.`,
        ]
      : []),
    "",
    "What we use it for",
    "Your information is used to manage who is on site, to let the person you are visiting know you have arrived, to keep a record of access, and to meet the organisation's record-keeping duties. It is not used for marketing or profiling.",
    "",
    "How long we keep it",
    `We keep your visit record for ${describeDays(input.retentionDays)}. After that it is deleted, unless the organisation is legally required to keep it for longer.`,
    "",
    "How it is protected",
    "Your details are encrypted when they travel and when they are stored. Only people whose role needs them can see them, and every time personal information is read, exported or deleted it is logged.",
    "",
    "Your rights",
    `You can ask ${name} to show you the information held about you, to correct it, or to delete it. Ask at reception and you will be told who handles these requests.`,
    "",
    `This notice is the organisation's standard visitor notice, provided through Buffr Checkpoint. ${name} may adjust it to fit how it works.`,
  ].join("\n");
}
