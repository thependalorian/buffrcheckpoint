import { REGISTRATION_PROOF_TYPES, type MemberInput } from "./kyb-validation";

// Rules that belong to configuration, not code: the beneficial-ownership thresholds (owner decision 2026-10-06: 25 percent or greater
// for BIPA, 20 percent or greater for the FIA, kept separate) and how old a certified identity copy may be. They live in the platform
// setting `kyb_rules`; these are the defaults when the setting is absent.

export interface KybRules {
  boThresholdBipaPercent: number;
  boThresholdFiaPercent: number;
  certifiedCopyMaxAgeMonths: number;
}

export const KYB_RULES_DEFAULT: KybRules = { boThresholdBipaPercent: 25, boThresholdFiaPercent: 20, certifiedCopyMaxAgeMonths: 6 };

function percent(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 100 ? value : fallback;
}

/** Reads the stored setting, ignoring any value that is not a sensible number so a bad edit cannot silently disable a rule. */
export function parseKybRules(stored: unknown): KybRules {
  const s = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const months = s.certifiedCopyMaxAgeMonths;
  return {
    boThresholdBipaPercent: percent(s.boThresholdBipaPercent, KYB_RULES_DEFAULT.boThresholdBipaPercent),
    boThresholdFiaPercent: percent(s.boThresholdFiaPercent, KYB_RULES_DEFAULT.boThresholdFiaPercent),
    certifiedCopyMaxAgeMonths: typeof months === "number" && Number.isInteger(months) && months > 0 && months <= 60 ? months : KYB_RULES_DEFAULT.certifiedCopyMaxAgeMonths,
  };
}

export interface OwnerFlag {
  fullName: string;
  percentage: number;
  juristic: boolean;
  /** Counts as a beneficial owner for a BIPA filing (at or above the BIPA threshold). */
  atBipa: boolean;
  /** Counts as a beneficial owner under the FIA (at or above the FIA threshold). */
  atFia: boolean;
}

export interface OwnershipAnalysis {
  owners: OwnerFlag[];
  /** Holders that are companies: only people can be beneficial owners, so these must be traced to the people behind them. */
  traceThrough: string[];
  /** Interest held by members and shareholders, as a percentage. */
  totalPercentage: number | null;
}

const OWNERSHIP_ROLES = ["member", "shareholder"];

export function analyseOwnership(people: MemberInput[], rules: KybRules): OwnershipAnalysis {
  const holders = people.filter((p) => (!p.role || OWNERSHIP_ROLES.includes(p.role)) && typeof p.percentage === "number");
  const owners = holders
    .map((p) => ({
      fullName: p.fullName,
      percentage: p.percentage as number,
      juristic: Boolean(p.isJuristic),
      atBipa: (p.percentage as number) >= rules.boThresholdBipaPercent,
      atFia: (p.percentage as number) >= rules.boThresholdFiaPercent,
    }))
    .filter((o) => o.atBipa || o.atFia)
    .sort((a, b) => b.percentage - a.percentage);
  return {
    owners,
    traceThrough: owners.filter((o) => o.juristic).map((o) => o.fullName),
    totalPercentage: holders.length ? holders.reduce((sum, p) => sum + (p.percentage as number), 0) : null,
  };
}

export interface ChecklistItem {
  code: string;
  label: string;
  /** Approval is held until every blocking item is satisfied. The rest are requested, not required. */
  blocking: boolean;
  satisfied: boolean;
  reason: string;
  /** For items that need several documents (one per owner): how many are needed and how many are on file. */
  needed?: number;
  have?: number;
}

/**
 * What must be on file (owner decision 2026-10-08): proof of registration with BIPA, a bank confirmation letter, a passport or identity
 * document for each owner, and proof of address (a lease agreement or utility bill). Good standing is not asked for. The BO1 declaration,
 * a company's register of directors and tracing a company holder to people are requested when the facts call for them but do not block.
 * Pass only accepted documents to learn whether approval may go ahead.
 */
export function documentChecklist(
  entityType: string | null,
  analysis: OwnershipAnalysis,
  documents: Array<{ documentType: string; status: string }>,
  rules: KybRules = KYB_RULES_DEFAULT,
): ChecklistItem[] {
  const live = documents.filter((d) => d.status !== "rejected");
  const have = (code: string) => live.filter((d) => d.documentType === code).length;
  const naturalOwners = analysis.owners.filter((o) => o.atFia && !o.juristic);
  const identitiesNeeded = Math.max(1, naturalOwners.length);
  const items: ChecklistItem[] = [
    {
      code: "registration_proof",
      label: "Proof of registration with BIPA (founding statement, amended founding statement or certificate)",
      blocking: true,
      satisfied: live.some((d) => (REGISTRATION_PROOF_TYPES as readonly string[]).includes(d.documentType)),
      reason: "Shows the business is registered and who registered it.",
    },
    {
      code: "bank_confirmation_letter",
      label: "Bank confirmation letter",
      blocking: true,
      satisfied: have("bank_confirmation_letter") > 0,
      reason: "Confirms the business holds the bank account it will pay from.",
    },
    {
      code: "certified_id_copy",
      label: `Passport or identity document of each owner (${identitiesNeeded})`,
      blocking: true,
      satisfied: have("certified_id_copy") >= identitiesNeeded,
      reason: "Identifies the people who own the business. A certified copy is best, certified within the last " + `${rules.certifiedCopyMaxAgeMonths} months.`,
      needed: identitiesNeeded,
      have: have("certified_id_copy"),
    },
    {
      code: "proof_of_address",
      label: "Proof of address (lease agreement or utility bill)",
      blocking: true,
      satisfied: have("proof_of_address") > 0,
      reason: "Shows where the business operates.",
    },
  ];
  if (analysis.owners.some((o) => o.atBipa)) {
    items.push({
      code: "beneficial_ownership_declaration",
      label: "Beneficial ownership declaration (BO1)",
      blocking: false,
      satisfied: have("beneficial_ownership_declaration") > 0,
      reason: "An owner holds at or above the BIPA threshold.",
    });
  }
  if (analysis.traceThrough.length > 0) {
    items.push({
      code: "ownership_trace",
      label: `Ownership traced through ${analysis.traceThrough.join(", ")} to the people behind it`,
      blocking: false,
      satisfied: false,
      reason: "Only a person can be a beneficial owner, so a company that holds a share must be traced to its owners.",
    });
  }
  if (entityType === "private_company" || entityType === "public_company") {
    items.push({
      code: "directors_register",
      label: "Register of directors (CM29)",
      blocking: false,
      satisfied: have("directors_register") > 0,
      reason: "Shows who runs the company.",
    });
  }
  return items;
}

/** The blocking items still missing, by label. Empty means the documents allow approval. */
export function blockingMissing(items: ChecklistItem[]): string[] {
  return items.filter((i) => i.blocking && !i.satisfied).map((i) => i.label);
}
