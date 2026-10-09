import {
  describeDays,
  HIGH_RISK_CLASSES,
  isSpecialCategorySector,
  isValidRetentionDays,
  MAX_RETENTION_DAYS,
  PRIVACY_NOTICE_POLICY_CODE,
  STANDARD_FORM_FIELDS,
  STANDARD_RETENTION_DAYS,
  standardFormFieldsFor,
  standardPrivacyNotice,
} from "./standard-defaults";

describe("standard check-in form", () => {
  it("follows the data minimisation standard: no high-risk class, core and basic by default", () => {
    for (const field of STANDARD_FORM_FIELDS) {
      expect({
        code: field.fieldCode,
        risky: (HIGH_RISK_CLASSES as readonly string[]).includes(field.dataClassificationCode),
      }).toEqual({
        code: field.fieldCode,
        risky: false,
      });
    }
    const codes = STANDARD_FORM_FIELDS.map((f) => f.fieldCode);
    expect(codes).not.toEqual(expect.arrayContaining(["id_document_number"]));
    expect(codes).toEqual(expect.arrayContaining(["visitor_name", "visitor_phone", "host", "purpose_category"]));
  });

  it("asks the minimum: name, phone, host and purpose are the only required fields", () => {
    expect(STANDARD_FORM_FIELDS.filter((f) => f.required).map((f) => f.fieldCode)).toEqual([
      "visitor_name",
      "visitor_phone",
      "host",
      "purpose_category",
    ]);
  });

  it("has unique codes in display order, and only shows the vehicle field for a vehicle visit", () => {
    const codes = STANDARD_FORM_FIELDS.map((f) => f.fieldCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(STANDARD_FORM_FIELDS.map((f) => f.displayOrder)).toEqual(
      [...STANDARD_FORM_FIELDS.map((f) => f.displayOrder)].sort((a, b) => a - b),
    );
    const vehicle = STANDARD_FORM_FIELDS.find((f) => f.fieldCode === "vehicle_registration");
    expect(vehicle?.required).toBe(false);
    expect(vehicle?.visibilityRule).toMatchObject({
      conditions: [{ fieldCode: "purpose_category", equals: "vehicle" }],
    });
    const purpose = STANDARD_FORM_FIELDS.find((f) => f.fieldCode === "purpose_category");
    expect((purpose?.validationSchema as { options: string[] } | undefined)?.options).toContain("vehicle");
  });
});

describe("standard visitor privacy notice", () => {
  const notice = standardPrivacyNotice({ organisationName: "Acme Trading", retentionDays: 365 });

  it("names the organisation as responsible and Buffr Checkpoint as the processor acting on its instructions", () => {
    expect(notice).toContain("Acme Trading is responsible for the information collected");
    expect(notice).toMatch(/Buffr Checkpoint[^.]*on Acme Trading's behalf and only on its instructions/);
  });

  it("lists exactly what the standard form collects, and says high-risk data is not asked for", () => {
    for (const field of ["Full name", "Mobile number", "Who are you visiting", "Purpose of visit"])
      expect(notice).toContain(field);
    expect(notice).toContain("Vehicle registration, only when your visit involves a vehicle");
    expect(notice).toMatch(/do not ask for ID numbers, photographs, health information or biometric data/);
  });

  it("states the retention period in days and no other period", () => {
    expect(notice).toContain("for 365 days");
    expect(standardPrivacyNotice({ organisationName: "A", retentionDays: 1 })).toContain("for 1 day.");
    expect(describeDays(30)).toBe("30 days");
  });

  it("has the commitments of the public policy and makes no compliance claim", () => {
    for (const heading of [
      "Who is responsible",
      "What we collect",
      "What we use it for",
      "How long we keep it",
      "How it is protected",
      "Your rights",
    ]) {
      expect(notice).toContain(heading);
    }
    expect(notice).toMatch(/not used for marketing or profiling/);
    expect(notice.toLowerCase()).not.toMatch(/\bcompliant\b|\bcertified\b|guarantee|legally binding|hosted in namibia/);
  });

  it("uses plain text with no em dash, no emoji and a safe fallback name", () => {
    expect(notice).not.toMatch(/—/);
    expect(notice).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(standardPrivacyNotice({ organisationName: "  ", retentionDays: 365 })).toContain(
      "This organisation is responsible",
    );
  });

  it("uses the policy code the kiosk and the website read", () => {
    expect(PRIVACY_NOTICE_POLICY_CODE).toBe("privacy_notice");
  });
});

describe("standard retention", () => {
  it("is a valid whole number of days, and invalid values are refused", () => {
    expect(isValidRetentionDays(STANDARD_RETENTION_DAYS)).toBe(true);
    for (const bad of [0, -1, 1.5, "365", null, MAX_RETENTION_DAYS + 1]) expect(isValidRetentionDays(bad)).toBe(false);
  });
});

describe("sector-aware defaults", () => {
  it("treats clinics, faith-based and community organisations as special-category sectors", () => {
    for (const code of ["healthcare", "religious_faith_based", "ngo_nonprofit"]) expect(isSpecialCategorySector(code)).toBe(true);
    for (const code of ["sme", "government", "financial_services", "other", null, undefined]) expect(isSpecialCategorySector(code)).toBe(false);
  });

  it("classes the purpose of the visit as sensitive for those sectors, and changes nothing else", () => {
    const sensitive = standardFormFieldsFor("healthcare");
    const normal = standardFormFieldsFor("sme");
    expect(sensitive.find((f) => f.fieldCode === "purpose_category")?.dataClassificationCode).toBe("sensitive");
    expect(normal.find((f) => f.fieldCode === "purpose_category")?.dataClassificationCode).toBe("basic");
    expect(sensitive.map((f) => f.fieldCode)).toEqual(normal.map((f) => f.fieldCode));
    expect(sensitive.filter((f) => f.fieldCode !== "purpose_category")).toEqual(normal.filter((f) => f.fieldCode !== "purpose_category"));
  });

  it("never introduces a high-risk class", () => {
    for (const code of ["healthcare", "religious_faith_based", "ngo_nonprofit"]) {
      for (const field of standardFormFieldsFor(code)) expect(HIGH_RISK_CLASSES).not.toContain(field.dataClassificationCode as never);
    }
  });

  it("says in the notice that the purpose is sensitive, only for those sectors", () => {
    const base = { organisationName: "Mercy Clinic", retentionDays: 365 };
    expect(standardPrivacyNotice({ ...base, sectorCode: "healthcare" })).toContain("treated as sensitive information");
    expect(standardPrivacyNotice({ ...base, sectorCode: "sme" })).not.toContain("treated as sensitive information");
    expect(standardPrivacyNotice(base)).not.toContain("treated as sensitive information");
  });
});
