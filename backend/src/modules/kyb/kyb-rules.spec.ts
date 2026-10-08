import { analyseOwnership, blockingMissing, documentChecklist, KYB_RULES_DEFAULT, parseKybRules } from "./kyb-rules";

describe("kyb rules", () => {
  it("defaults to the owner's thresholds, 25 for BIPA and 20 for the FIA, and keeps them separate", () => {
    expect(parseKybRules(undefined)).toEqual({ boThresholdBipaPercent: 25, boThresholdFiaPercent: 20, certifiedCopyMaxAgeMonths: 6 });
    expect(parseKybRules({ boThresholdFiaPercent: 10 })).toMatchObject({ boThresholdBipaPercent: 25, boThresholdFiaPercent: 10 });
  });
  it("ignores a bad edit rather than switching a rule off", () => {
    expect(parseKybRules({ boThresholdBipaPercent: 0, boThresholdFiaPercent: "20", certifiedCopyMaxAgeMonths: -3 })).toEqual(KYB_RULES_DEFAULT);
  });
});

describe("ownership", () => {
  const rules = KYB_RULES_DEFAULT;
  it("is a beneficial owner for the FIA at 22 percent but not for BIPA", () => {
    const a = analyseOwnership([{ fullName: "Anna Example", role: "member", percentage: 22 }, { fullName: "Ben Example", role: "member", percentage: 78 }], rules);
    expect(a.owners.map((o) => [o.fullName, o.atBipa, o.atFia])).toEqual([["Ben Example", true, true], ["Anna Example", false, true]]);
    expect(a.totalPercentage).toBe(100);
  });
  it("leaves out holders below both thresholds, and directors", () => {
    const a = analyseOwnership([{ fullName: "Small Holder", role: "shareholder", percentage: 5 }, { fullName: "Director Only", role: "director" }], rules);
    expect(a.owners).toEqual([]);
  });
  it("sends a company holder to be traced to the people behind it", () => {
    const a = analyseOwnership([{ fullName: "Sample Holdings CC", isJuristic: true, registrationNumber: "CC/2006/0278", percentage: 60 }], rules);
    expect(a.traceThrough).toEqual(["Sample Holdings CC"]);
  });
});

describe("document checklist", () => {
  const one = analyseOwnership([{ fullName: "Anna Example", role: "member", percentage: 100 }], KYB_RULES_DEFAULT);
  const accepted = (...types: string[]) => types.map((documentType) => ({ documentType, status: "accepted" }));

  it("blocks approval on registration proof, a bank confirmation letter, an owner's identity document and proof of address", () => {
    const none = documentChecklist("close_corporation", one, []);
    expect(none.filter((i) => i.blocking).map((i) => i.code)).toEqual(["registration_proof", "bank_confirmation_letter", "certified_id_copy", "proof_of_address"]);
    expect(blockingMissing(none)).toHaveLength(4);
  });

  it("does not ask for a tax good standing certificate", () => {
    expect(documentChecklist("close_corporation", one, []).some((i) => i.code === "tax_good_standing")).toBe(false);
  });

  it("is satisfied once each required document is on file, and a rejected one counts as absent", () => {
    const docs = accepted("founding_statement", "bank_confirmation_letter", "certified_id_copy", "proof_of_address");
    expect(blockingMissing(documentChecklist("close_corporation", one, docs))).toEqual([]);
    expect(blockingMissing(documentChecklist("close_corporation", one, [...docs.slice(0, 3), { documentType: "proof_of_address", status: "rejected" }]))).toEqual(["Proof of address (lease agreement or utility bill)"]);
  });

  it("needs one identity document per owner at or above the FIA threshold", () => {
    const two = analyseOwnership([{ fullName: "A One", role: "shareholder", percentage: 50 }, { fullName: "B Two", role: "shareholder", percentage: 50 }], KYB_RULES_DEFAULT);
    const items = documentChecklist("private_company", two, accepted("certified_id_copy"));
    expect(items.find((i) => i.code === "certified_id_copy")).toMatchObject({ satisfied: false, needed: 2, have: 1 });
    expect(items.some((i) => i.code === "directors_register" && !i.blocking)).toBe(true);
  });

  it("asks for the BO1 declaration only when an owner reaches the BIPA threshold, and never blocks on it", () => {
    const items = documentChecklist("close_corporation", one, []);
    expect(items.find((i) => i.code === "beneficial_ownership_declaration")).toMatchObject({ blocking: false });
    const small = analyseOwnership([{ fullName: "A One", role: "member", percentage: 22 }, { fullName: "B Two", role: "member", percentage: 78 }], KYB_RULES_DEFAULT);
    expect(documentChecklist("close_corporation", small, []).find((i) => i.code === "beneficial_ownership_declaration")).toBeDefined();
  });
});
