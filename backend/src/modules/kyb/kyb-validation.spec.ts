import {
  crossCheck,
  detectFileType,
  inferEntityType,
  normaliseRegistrationNumber,
  safeFileName,
  validateAddress,
  validateDocumentFile,
  validateKybFields,
  validateMembers,
  validateNamibianId,
  validateRegistrationNumber,
} from "./kyb-validation";

const NOW = new Date("2026-10-08T00:00:00Z");

describe("registration numbers", () => {
  it.each([
    ["cc 2024 09322", "CC/2024/09322"],
    ["CC2024/09322", "CC/2024/09322"],
    ["CC-2024-09322", "CC/2024/09322"],
    ["2013/0456", "2013/0456"],
  ])("normalises %s", (input, expected) => expect(normaliseRegistrationNumber(input)).toBe(expected));

  it("infers the entity type from the format", () => {
    expect(inferEntityType("CC/2024/09322")).toBe("close_corporation");
    expect(inferEntityType("2013/0456")).toBe("private_company");
    expect(inferEntityType("hello")).toBeNull();
  });

  it("warns, never refuses, an unusual but plausible number: no specification is published, so a strict pattern would turn real businesses away", () => {
    expect(validateRegistrationNumber("CC/2006/0278", "close_corporation", NOW)).toEqual([]);
    expect(validateRegistrationNumber("CC/94/1234", "close_corporation", NOW)[0]).toMatchObject({ code: "registrationFormat", severity: "warning" });
    expect(validateRegistrationNumber("CC/2031/00001", "close_corporation", NOW)[0]).toMatchObject({ code: "registrationYear", severity: "warning" });
    expect(validateRegistrationNumber("2013/0456", "close_corporation", NOW)[0]).toMatchObject({ code: "registrationEntityMismatch", severity: "warning" });
    expect(validateRegistrationNumber("CC/2024/09322", "close_corporation", NOW)).toEqual([]);
  });

  it("refuses only what cannot be a registration number at all", () => {
    expect(validateRegistrationNumber("", "close_corporation", NOW)[0]).toMatchObject({ code: "registrationRequired", severity: "error" });
    expect(validateRegistrationNumber("<script>alert(1)</script>", "close_corporation", NOW)[0]).toMatchObject({ code: "registrationFormat", severity: "error" });
  });

  it("accepts a plausible token for bodies that register differently", () => {
    expect(validateRegistrationNumber("NPO-2020-77", "non_profit", NOW)).toEqual([]);
  });
});

describe("addresses and names", () => {
  it("refuses a post office box as the registered office", () => {
    expect(validateAddress("PO BOX 90022 ONGWEDIVA, NAMIBIA")[0]?.code).toBe("addressPoBox");
    expect(validateAddress("Unit 4, Example Park, Windhoek")).toEqual([]);
    expect(validateAddress("Windhoek")[0]?.code).toBe("addressShort");
  });

  it("warns, not errors, when the business name lacks the expected suffix", () => {
    const issues = validateKybFields(
      {
        entityType: "close_corporation",
        businessRegistrationNumber: "CC/2024/09322",
        registeredBusinessName: "Sample Trading",
        registeredAddress: "Sample Street 12, Example Park, Windhoek",
        authorizedSignatoryName: "Anna Example",
      },
      NOW,
    );
    expect(issues.filter((i) => i.field === "registeredBusinessName")).toEqual([expect.objectContaining({ severity: "warning" })]);
  });
});

describe("identity numbers", () => {
  it("checks length and digits only, and never derives a date of birth (the structure is not published)", () => {
    expect(validateNamibianId("91012400457", "id")).toEqual({ issues: [] });
    expect(validateNamibianId("91 0124 00457", "id")).toEqual({ issues: [] });
    expect(validateNamibianId("91023100457", "id")).toEqual({ issues: [] });
    expect(validateNamibianId("1234", "id").issues[0]?.code).toBe("idLength");
    expect(validateNamibianId("9101240045A", "id").issues[0]?.code).toBe("idLength");
  });
});

describe("people behind the business", () => {
  it("needs a registration number for a juristic member and a known role", () => {
    const issues = validateMembers([{ fullName: "Sample Holdings CC", isJuristic: true, percentage: 100, role: "member" }, { fullName: "Anna Example", role: "wizard" }], "close_corporation");
    expect(issues.map((i) => i.code).sort()).toEqual(["juristicNeedsRegistration", "roleUnknown"]);
  });
  it("asks for the people when a registered entity gives none, but not for a sole proprietor", () => {
    expect(validateMembers([], "close_corporation")[0]).toMatchObject({ code: "peopleMissing", severity: "warning" });
    expect(validateMembers([], "sole_proprietor")).toEqual([]);
  });
  it("totals shares over members and shareholders only, not directors", () => {
    const issues = validateMembers([{ fullName: "Anna Example", role: "member", percentage: 100 }, { fullName: "Ben Example", role: "director" }], "close_corporation");
    expect(issues).toEqual([]);
  });
});

describe("contact, tax number and date", () => {
  it("accepts blanks and sensible values, refuses the rest", () => {
    expect(validateKybFields({ entityType: "other", businessRegistrationNumber: "NPO-77", registeredBusinessName: "Sample Trust", registeredAddress: "Sample Street 12, Example Park, Windhoek", authorizedSignatoryName: "Anna Example", contactEmail: "bad", contactPhone: "12", tin: "!!", incorporatedOn: "2031-01-01" }, NOW).map((i) => i.field).sort()).toEqual(["contactEmail", "contactPhone", "incorporatedOn", "tin"]);
    expect(validateKybFields({ entityType: "other", businessRegistrationNumber: "NPO-77", registeredBusinessName: "Sample Trust", registeredAddress: "Sample Street 12, Example Park, Windhoek", authorizedSignatoryName: "Anna Example", contactEmail: "a@b.example", contactPhone: "+264 61 123 4567", tin: "1234567", incorporatedOn: "2020-05-17" }, NOW)).toEqual([]);
  });
});

describe("members", () => {
  it("warns when a close corporation's shares do not total 100", () => {
    const issues = validateMembers(
      [
        { fullName: "Anna Example", percentage: 60 },
        { fullName: "Ben Example", percentage: 30 },
      ],
      "close_corporation",
    );
    expect(issues).toEqual([expect.objectContaining({ field: "members", code: "percentageTotal", severity: "warning" })]);
  });
});

describe("document files", () => {
  const pdf = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(2048)]);
  it("decides the type from the first bytes, not the name", () => {
    expect(detectFileType(pdf)).toBe("pdf");
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]))).toBe("jpeg");
    expect(detectFileType(Buffer.from("MZ executable pretending to be a pdf"))).toBeNull();
  });
  it("refuses empty, tiny, huge and unknown files", () => {
    expect(validateDocumentFile(Buffer.alloc(0)).issues[0]?.code).toBe("documentEmpty");
    expect(validateDocumentFile(Buffer.from("%PDF-1.7")).issues[0]?.code).toBe("documentSize");
    expect(validateDocumentFile(Buffer.alloc(2048, 1)).issues[0]?.code).toBe("documentType");
    expect(validateDocumentFile(pdf).type).toBe("pdf");
  });
  it("cleans a file name for storage", () => {
    expect(safeFileName('../../etc/pass"wd<script>.exe', "pdf")).toBe("etcpasswdscript.pdf");
  });
});

describe("cross check", () => {
  it("compares typed values with the document, ignoring case and punctuation", () => {
    const rows = crossCheck(
      { businessRegistrationNumber: "cc 2024 09322", registeredBusinessName: "Sample Trading cc", registeredAddress: "Unit 4, Example Park" },
      { registrationNumber: "CC/2024/09322", businessName: "SAMPLE TRADING CC", registeredAddress: "Unit 5 Example Park" },
    );
    expect(rows.map((r) => r.result)).toEqual(["match", "match", "mismatch"]);
    expect(crossCheck({ businessRegistrationNumber: "x", registeredBusinessName: "y", registeredAddress: "z" }, null).every((r) => r.result === "not_read")).toBe(true);
  });
});
