import { analyseOwnership, documentChecklist, KYB_RULES_DEFAULT, parseKybRules } from "./kyb-rules";

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
  it("blocks only on proof of registration, and counts a rejected document as absent", () => {
    const analysis = analyseOwnership([{ fullName: "Anna Example", role: "member", percentage: 100 }], KYB_RULES_DEFAULT);
    const none = documentChecklist("close_corporation", analysis, [{ documentType: "founding_statement", status: "rejected" }]);
    expect(none.filter((i) => i.blocking).every((i) => !i.satisfied)).toBe(true);
    const ok = documentChecklist("close_corporation", analysis, [{ documentType: "founding_statement", status: "accepted" }]);
    expect(ok.find((i) => i.code === "registration_proof")?.satisfied).toBe(true);
    expect(ok.filter((i) => !i.blocking).map((i) => i.code)).toEqual(["beneficial_ownership_declaration", "certified_id_copy"]);
  });
  it("asks a company for its directors, and one certified copy per natural owner", () => {
    const analysis = analyseOwnership([{ fullName: "A One", role: "shareholder", percentage: 50 }, { fullName: "B Two", role: "shareholder", percentage: 50 }], KYB_RULES_DEFAULT);
    const items = documentChecklist("private_company", analysis, [{ documentType: "certified_id_copy", status: "received" }]);
    expect(items.find((i) => i.code === "certified_id_copy")).toMatchObject({ satisfied: false });
    expect(items.some((i) => i.code === "directors_register")).toBe(true);
  });
});
