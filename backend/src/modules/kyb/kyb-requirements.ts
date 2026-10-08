// What a Namibian legal person's verification needs, taken from the BIPA field dictionary (buffr-kyc/docs/BIPA_KYB_FIELD_DICTIONARY.md,
// built from BO1, CC1, CC7, CM2, CM5, CM22, CM29, CM31, CM44C and CM46), and where each requirement is met in this product.
// Checkpoint's verification is business-identity verification at onboarding for a visitor-management product: it is not AML
// monitoring and not a BIPA filing, so the requirements that belong to those are listed as out of scope WITH a reason, never left
// out silently. A test keeps this register honest: every captured field must exist in the API contract.

export type Coverage = "field" | "document" | "config" | "validation" | "out_of_scope";

export interface Requirement {
  id: string;
  /** The BIPA form and item the dictionary cites. */
  source: string;
  coverage: Coverage;
  /** For field coverage, the name in the submission contract; for document, the document type code; for config, the setting key. */
  where?: string;
  /** For out_of_scope, why: a decision, not an omission. */
  reason?: string;
}

const SCOPE_BO1 =
  "Particulars of the people behind the business that only a BIPA beneficial-ownership filing needs. Checkpoint collects the ownership (name, share, role, identity number if offered) and asks for the BO1 declaration as a document; the filing is the customer's own duty.";
const SCOPE_AML = "Ongoing screening is AML monitoring, which this onboarding verification deliberately does not do (backend/src/db/schema/kyb.ts).";

export const KYB_REQUIREMENTS: Requirement[] = [
  // The entity
  { id: "Full legal name", source: "BO1 A.2.I, CC1, CM2", coverage: "field", where: "registeredBusinessName" },
  { id: "Shortened form and literal translation of the name", source: "CC1, CM2", coverage: "out_of_scope", reason: "The registered name identifies the entity; the shortened form and translation add nothing to identity." },
  { id: "Registration number", source: "BO1 A.2.III, CM22, CM29", coverage: "field", where: "businessRegistrationNumber" },
  { id: "Registration number format", source: "dictionary note", coverage: "validation", where: "validateRegistrationNumber" },
  { id: "Tax identification number", source: "BO1 A.2.II", coverage: "field", where: "tin" },
  { id: "Country of incorporation", source: "BO1 A.2.IV", coverage: "out_of_scope", reason: "Every customer is a Namibian legal person, so the country is not a variable; a foreign entity would be a new product decision." },
  { id: "Type of entity", source: "BO1 A.3", coverage: "field", where: "entityType" },
  { id: "Date incorporated", source: "CM46, CC7 B", coverage: "field", where: "incorporatedOn" },
  { id: "Principal business", source: "CC1, CM2 item 2", coverage: "field", where: "principalBusiness" },
  { id: "Financial year end", source: "CC1, CM46, CC7 A", coverage: "field", where: "financialYearEnd" },
  { id: "Registered office (not a post office box)", source: "CM22 (i), CC1", coverage: "field", where: "registeredAddress" },
  { id: "Registered office is a street address", source: "CC1", coverage: "validation", where: "validateAddress" },
  { id: "Postal address", source: "CM22 (ii), CC1", coverage: "field", where: "postalAddress" },
  { id: "Email", source: "CM22, CC1", coverage: "field", where: "contactEmail" },
  { id: "Telephone", source: "CM22, CC1", coverage: "field", where: "contactPhone" },
  // The people
  { id: "Person: first names and surname", source: "BO1 B.1.I-II, CM29 items 1-2", coverage: "field", where: "fullName" },
  { id: "Person: identity number", source: "BO1 B.1.XIII-XV, CM29 item 4", coverage: "field", where: "identityNumber" },
  { id: "Person: identity number is 11 digits", source: "dictionary note", coverage: "validation", where: "validateNamibianId" },
  { id: "Person: previous name", source: "BO1 B.1.III, CM29 item 3", coverage: "out_of_scope", reason: SCOPE_BO1 },
  { id: "Person: date and place of birth, nationality", source: "BO1 B.1.IV-VI, CM29 item 11", coverage: "out_of_scope", reason: SCOPE_BO1 },
  { id: "Person: residential, business and postal address", source: "BO1 B.1.VII-VIII, CM29 items 6-8", coverage: "out_of_scope", reason: SCOPE_BO1 },
  { id: "Person: phone", source: "BO1 B.1.XI, CM29 item 9; owner requirement 2026-10-08", coverage: "field", where: "phone" },
  { id: "Person: email", source: "BO1 B.1.XII, CM29 item 10; owner requirement 2026-10-08", coverage: "field", where: "email" },
  { id: "Person: tax number, workplace and position, residency", source: "BO1 B.1.X, XVI, CM29 items 12-13", coverage: "out_of_scope", reason: SCOPE_BO1 },
  // Roles and ownership
  { id: "Role in the entity (member, director, shareholder, secretary, accounting officer)", source: "CC1, CM29 A, CM31, CM2", coverage: "field", where: "role" },
  { id: "Appointed and ceased dates, fair value of interest", source: "CM29 item 5, CC1", coverage: "out_of_scope", reason: "History of appointments belongs to the register of directors, which is requested as a document (CM29); the current roles are captured." },
  { id: "Interest percentage", source: "CC1, CC7", coverage: "field", where: "percentage" },
  { id: "Close corporation members total 100 percent", source: "CC1, CC7", coverage: "validation", where: "validateMembers" },
  { id: "A company holder is traced to the people behind it", source: "BO1 Part C 2(d)", coverage: "field", where: "isJuristic" },
  { id: "Juristic holder's registration number", source: "CC1 Part C (ii)", coverage: "field", where: "registrationNumber" },
  { id: "Ownership threshold, BIPA 25 percent", source: "BO1 Part C 2(e)(1), owner decision 2026-10-06", coverage: "config", where: "boThresholdBipaPercent" },
  { id: "Ownership threshold, FIA 20 percent", source: "FIA, owner decision 2026-10-06", coverage: "config", where: "boThresholdFiaPercent" },
  { id: "The eight BO1 types of beneficial ownership tested per person", source: "BO1 Part C", coverage: "out_of_scope", reason: "The ownership-percentage test is applied; the full eight-type assessment is made in the BO1 declaration, which is requested as a document when an owner reaches the BIPA threshold." },
  { id: "Ownership change filed within 7 days", source: "BO1 Part C 2(c)(iii)", coverage: "out_of_scope", reason: "A filing duty of the customer to BIPA, not part of verifying the customer to Checkpoint." },
  // Evidence
  { id: "Proof of registration", source: "CC1, CC2, CM1", coverage: "document", where: "founding_statement" },
  { id: "Amended founding statement", source: "CC2", coverage: "document", where: "amended_founding_statement" },
  { id: "Registration certificate", source: "CM1", coverage: "document", where: "registration_certificate" },
  { id: "Beneficial ownership declaration", source: "BO1", coverage: "document", where: "beneficial_ownership_declaration" },
  { id: "Register of directors", source: "CM29", coverage: "document", where: "directors_register" },
  { id: "Passport or identity document of each owner", source: "BO1 Part C 1(f); owner requirement 2026-10-08", coverage: "document", where: "certified_id_copy" },
  { id: "Certified copy not older than 6 months", source: "BO1 Part C 1(f)", coverage: "config", where: "certifiedCopyMaxAgeMonths" },
  { id: "Bank confirmation letter", source: "owner requirement 2026-10-08", coverage: "document", where: "bank_confirmation_letter" },
  { id: "Proof of address (lease agreement or utility bill)", source: "owner requirement 2026-10-08", coverage: "document", where: "proof_of_address" },
  { id: "Registration confirmed on the BIPA register by a reviewer", source: "owner requirement 2026-10-08", coverage: "field", where: "registryChecked" },
  { id: "Registration with the Financial Intelligence Centre", source: "BO1 Part C 1(g)", coverage: "out_of_scope", reason: "Only accountable institutions register with the FIC; a visitor-management customer usually is not one. It can be uploaded as a supporting document if it applies." },
  // Checks the dictionary adds
  { id: "Sanctions screening of the entity and every party", source: "dictionary, UN Security Council list", coverage: "out_of_scope", reason: SCOPE_AML },
  { id: "Prominent Influential Person check", source: "dictionary, FIA Schedule 6", coverage: "out_of_scope", reason: SCOPE_AML },
];

export interface CoverageSummary {
  total: number;
  covered: number;
  outOfScope: number;
  byCoverage: Record<Coverage, number>;
  /** Share of requirements that are met by a field, document, configuration or validation, in percent. */
  coveredPercent: number;
}

export function summariseCoverage(requirements: Requirement[] = KYB_REQUIREMENTS): CoverageSummary {
  const byCoverage: Record<Coverage, number> = { field: 0, document: 0, config: 0, validation: 0, out_of_scope: 0 };
  for (const r of requirements) byCoverage[r.coverage] += 1;
  const outOfScope = byCoverage.out_of_scope;
  const covered = requirements.length - outOfScope;
  return { total: requirements.length, covered, outOfScope, byCoverage, coveredPercent: Math.round((covered / requirements.length) * 1000) / 10 };
}
